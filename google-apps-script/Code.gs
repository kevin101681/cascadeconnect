/**
 * GOOGLE APPS SCRIPT - GMAIL ADD-ON
 * Cascade Connect Command Center
 * 
 * INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Paste this code into Code.gs
 * 4. Update the CONFIG section with your values
 * 5. Deploy as Gmail Add-on (see appsscript.json for manifest)
 */

// ============================================
// CONFIGURATION
// ============================================

var CONFIG = {
  API_URL: 'https://cascadeconnect.netlify.app/.netlify/functions/gmail-addon',
  ADDON_SECRET: 'YOUR_SECRET_HERE', // Replace with your GMAIL_ADDON_SECRET
  DASHBOARD_URL: 'https://cascadeconnect.netlify.app/dashboard'
};

// ============================================
// MAIN ADD-ON ENTRY POINT
// ============================================

/**
 * Called when a message is opened in Gmail
 * @param {Object} e - Event object from Gmail
 */
function buildAddOn(e) {
  // Get the current message
  var message = getCurrentMessage(e);
  
  if (!message) {
    return createErrorCard('Unable to load message');
  }
  
  var subject = message.getSubject();
  
  Logger.log('Gmail Add-on triggered for: ' + subject);
  
  // Check if this is a relevant email
  var extractedData = extractDataFromSubject(subject);
  
  if (!extractedData) {
    // Not a relevant email - don't show the add-on
    return null;
  }
  
  // Fetch data from API
  var apiData = fetchCascadeData(extractedData);
  
  if (!apiData) {
    return createErrorCard('Failed to fetch data from Cascade Connect');
  }
  
  // Build the UI card
  return buildCommandCenterCard(apiData, extractedData);
}

// ============================================
// DATA EXTRACTION
// ============================================

/**
 * Extract address or phone number from email subject
 * @param {string} subject - Email subject line
 * @returns {Object|null} - { type, address?, phoneNumber? }
 */
function extractDataFromSubject(subject) {
  // Pattern 1: "🚨 New Warranty Claim: 123 Main St, Denver, CO"
  var claimMatch = subject.match(/(?:🚨|⚠️)?\s*New Warranty Claim[:\s]+(.+)/i);
  if (claimMatch) {
    return {
      type: 'claim',
      address: claimMatch[1].trim()
    };
  }
  
  // Pattern 2: "⚠️ Unknown Caller: (555) 123-4567"
  var unknownMatch = subject.match(/(?:🚨|⚠️)?\s*Unknown Caller[:\s]+(.+)/i);
  if (unknownMatch) {
    return {
      type: 'unknown',
      phoneNumber: unknownMatch[1].trim()
    };
  }
  
  // Pattern 3: Generic "Warranty Claim" with address in parentheses
  var genericMatch = subject.match(/Warranty Claim.*\(([^)]+)\)/i);
  if (genericMatch) {
    return {
      type: 'claim',
      address: genericMatch[1].trim()
    };
  }
  
  return null;
}

// ============================================
// API COMMUNICATION
// ============================================

/**
 * Fetch data from Cascade Connect API
 * @param {Object} data - { type, address?, phoneNumber? }
 * @returns {Object|null} - API response data
 */
function fetchCascadeData(data) {
  try {
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-cascade-addon-secret': CONFIG.ADDON_SECRET
      },
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };
    
    Logger.log('Fetching from API: ' + CONFIG.API_URL);
    
    var response = UrlFetchApp.fetch(CONFIG.API_URL, options);
    var statusCode = response.getResponseCode();
    
    if (statusCode !== 200) {
      Logger.log('API error: ' + statusCode + ' - ' + response.getContentText());
      return null;
    }
    
    var result = JSON.parse(response.getContentText());
    Logger.log('API response: ' + JSON.stringify(result));
    
    return result;
  } catch (error) {
    Logger.log('Error fetching data: ' + error.toString());
    return null;
  }
}

// ============================================
// UI BUILDING
// ============================================

/**
 * Build the main command center card
 * @param {Object} apiData - Data from API
 * @param {Object} extractedData - Original extracted data
 * @returns {Card}
 */
function buildCommandCenterCard(apiData, extractedData) {
  var card = CardService.newCardBuilder();
  
  // Header
  var header = CardService.newCardHeader()
    .setTitle('🎯 Cascade Command Center')
    .setSubtitle(extractedData.type === 'claim' ? 'Warranty Claim' : 'Unknown Caller')
    .setImageUrl('https://cascadeconnect.netlify.app/logo.svg');
  
  card.setHeader(header);
  
  // ============================================
  // SECTION 1: DETAILS
  // ============================================
  
  var detailsSection = CardService.newCardSection()
    .setHeader('📋 Details');
  
  if (apiData.homeownerName) {
    detailsSection.addWidget(
      CardService.newKeyValue()
        .setTopLabel('Homeowner')
        .setContent(apiData.homeownerName)
        .setIcon(CardService.Icon.PERSON)
    );
  }
  
  if (apiData.status) {
    var statusEmoji = getStatusEmoji(apiData.status);
    detailsSection.addWidget(
      CardService.newKeyValue()
        .setTopLabel('Status')
        .setContent(statusEmoji + ' ' + apiData.status)
        .setIcon(CardService.Icon.BOOKMARK)
    );
  }
  
  if (apiData.claimNumber) {
    detailsSection.addWidget(
      CardService.newKeyValue()
        .setTopLabel('Claim #')
        .setContent(apiData.claimNumber)
        .setIcon(CardService.Icon.DESCRIPTION)
    );
  }
  
  if (apiData.summary) {
    detailsSection.addWidget(
      CardService.newTextParagraph()
        .setText('<b>Summary:</b><br>' + apiData.summary)
    );
  }
  
  card.addSection(detailsSection);
  
  // ============================================
  // SECTION 2: PHONE MATCHES (for Unknown Caller)
  // ============================================
  
  if (extractedData.type === 'unknown' && apiData.phoneMatches && apiData.phoneMatches.length > 0) {
    var matchesSection = CardService.newCardSection()
      .setHeader('👥 Matching Homeowners (' + apiData.phoneMatches.length + ')');
    
    apiData.phoneMatches.forEach(function(match) {
      matchesSection.addWidget(
        CardService.newKeyValue()
          .setTopLabel(match.name)
          .setContent(match.address || 'No address')
          .setBottomLabel(match.builder || 'No builder')
          .setIcon(CardService.Icon.PERSON)
          .setMultiline(true)
      );
    });
    
    card.addSection(matchesSection);
  }
  
  // ============================================
  // SECTION 3: RECENT CLAIMS (for Unknown Caller)
  // ============================================
  
  if (apiData.recentClaims && apiData.recentClaims.length > 0) {
    var claimsSection = CardService.newCardSection()
      .setHeader('📄 Recent Claims (' + apiData.recentClaims.length + ')');
    
    apiData.recentClaims.forEach(function(claim) {
      var claimDate = new Date(claim.dateSubmitted);
      claimsSection.addWidget(
        CardService.newKeyValue()
          .setTopLabel('Claim #' + (claim.claimNumber || 'N/A'))
          .setContent(claim.title)
          .setBottomLabel(getStatusEmoji(claim.status) + ' ' + claim.status + ' • ' + formatDate(claimDate))
          .setIcon(CardService.Icon.DESCRIPTION)
          .setMultiline(true)
      );
    });
    
    card.addSection(claimsSection);
  }
  
  // ============================================
  // SECTION 4: ACTIONS
  // ============================================
  
  var actionsSection = CardService.newCardSection();
  
  // View in Dashboard button
  var dashboardButton = CardService.newTextButton()
    .setText('🔗 View in Dashboard')
    .setOpenLink(CardService.newOpenLink()
      .setUrl(apiData.linkToDashboard)
      .setOpenAs(CardService.OpenAs.FULL_SIZE)
      .setOnClose(CardService.OnClose.NOTHING));
  
  actionsSection.addWidget(dashboardButton);
  
  // Quick actions for claims
  if (extractedData.type === 'claim' && apiData.claimId) {
    var approveButton = CardService.newTextButton()
      .setText('✅ Quick Approve')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('handleQuickApprove')
          .setParameters({ claimId: apiData.claimId })
      )
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED);
    
    actionsSection.addWidget(approveButton);
    
    var scheduleButton = CardService.newTextButton()
      .setText('📅 Schedule Inspection')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('handleScheduleInspection')
          .setParameters({ claimId: apiData.claimId })
      );
    
    actionsSection.addWidget(scheduleButton);
  }
  
  // Call back button for unknown callers
  if (extractedData.type === 'unknown' && extractedData.phoneNumber) {
    var callButton = CardService.newTextButton()
      .setText('📞 Call Back')
      .setOpenLink(CardService.newOpenLink()
        .setUrl('tel:' + extractedData.phoneNumber)
        .setOnClose(CardService.OnClose.NOTHING));
    
    actionsSection.addWidget(callButton);
  }
  
  card.addSection(actionsSection);
  
  // ============================================
  // FOOTER
  // ============================================
  
  var footer = CardService.newFixedFooter()
    .setPrimaryButton(
      CardService.newTextButton()
        .setText('Refresh')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('buildAddOn')
        )
    );
  
  card.setFixedFooter(footer);
  
  return card.build();
}

// ============================================
// ACTION HANDLERS
// ============================================

/**
 * Handle Quick Approve action
 */
function handleQuickApprove(e) {
  var claimId = e.parameters.claimId;
  
  // TODO: Call your API to update claim status
  // For now, just show a confirmation
  
  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification()
        .setText('✅ Claim approved! Status updated to REVIEWING.')
    )
    .build();
}

/**
 * Handle Schedule Inspection action
 */
function handleScheduleInspection(e) {
  var claimId = e.parameters.claimId;
  
  // Open the dashboard in scheduling mode
  var url = CONFIG.DASHBOARD_URL + '?claim=' + claimId + '&action=schedule';
  
  return CardService.newActionResponseBuilder()
    .setOpenLink(
      CardService.newOpenLink()
        .setUrl(url)
        .setOpenAs(CardService.OpenAs.FULL_SIZE)
    )
    .build();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current Gmail message
 */
function getCurrentMessage(e) {
  var messageId = e.gmail.messageId;
  var accessToken = e.gmail.accessToken;
  
  GmailApp.setCurrentMessageAccessToken(accessToken);
  return GmailApp.getMessageById(messageId);
}

/**
 * Create an error card
 */
function createErrorCard(message) {
  var card = CardService.newCardBuilder();
  
  card.setHeader(
    CardService.newCardHeader()
      .setTitle('⚠️ Error')
  );
  
  card.addSection(
    CardService.newCardSection()
      .addWidget(
        CardService.newTextParagraph()
          .setText(message)
      )
  );
  
  return card.build();
}

/**
 * Get emoji for claim status
 */
function getStatusEmoji(status) {
  var statusMap = {
    'SUBMITTED': '📨',
    'REVIEWING': '🔍',
    'SCHEDULING': '📅',
    'SCHEDULED': '✅',
    'COMPLETED': '🎉'
  };
  
  return statusMap[status] || '📋';
}

/**
 * Format date for display
 */
function formatDate(date) {
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
}

