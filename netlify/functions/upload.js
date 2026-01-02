// Cloudinary Upload Function for Netlify
const { v2: cloudinary } = require('cloudinary');
const Busboy = require('busboy');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET,
});

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Check if Cloudinary is configured
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary configuration missing!');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Upload service not configured',
          message: 'Cloudinary credentials are missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Netlify environment variables.'
        })
      };
    }

    // Parse multipart form data
    return new Promise((resolve) => {
      const busboy = Busboy({ headers: event.headers });
      let filename = '';
      let mimetype = '';

      busboy.on('file', (fieldname, file, info) => {
        filename = info.filename;
        mimetype = info.mimeType;
        
        console.log('📦 File started:', {
          name: filename,
          mimetype: mimetype
        });

        // Stream directly to Cloudinary instead of buffering in memory
        console.log('☁️ Streaming to Cloudinary...');
        
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'warranty-claims',
            resource_type: 'auto',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx'],
            timeout: 120000, // 2 minute timeout
          },
          async (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', {
                message: error.message,
                http_code: error.http_code,
                name: error.name,
                filename: filename
              });
              
              const errorMsg = error.http_code 
                ? `Cloudinary error (${error.http_code}): ${error.message}`
                : `Cloudinary error: ${error.message || 'Unknown error'}`;
              
              resolve({
                statusCode: 500,
                headers,
                body: JSON.stringify({
                  error: 'Upload failed',
                  message: errorMsg,
                  filename: filename
                })
              });
              return;
            }
            
            if (!result) {
              console.error('❌ No result from Cloudinary');
              resolve({
                statusCode: 500,
                headers,
                body: JSON.stringify({
                  error: 'Upload failed',
                  message: 'Cloudinary upload returned no result',
                  filename: filename
                })
              });
              return;
            }

            // Upload successful
            try {
              // Determine file type
              let fileType = 'DOCUMENT';
              if (result.resource_type === 'image') {
                fileType = 'IMAGE';
              } else if (result.resource_type === 'video') {
                fileType = 'VIDEO';
              }

              const fileSizeMB = (result.bytes / 1024 / 1024).toFixed(2);
              console.log('✅ File uploaded successfully:', {
                url: result.secure_url,
                size: `${result.bytes} bytes (${fileSizeMB}MB)`,
                type: fileType
              });

              resolve({
                statusCode: 200,
                headers,
                body: JSON.stringify({
                  success: true,
                  url: result.secure_url,
                  publicId: result.public_id,
                  type: fileType,
                  name: filename,
                  size: result.bytes,
                })
              });
            } catch (error) {
              console.error('❌ Error processing result:', error);
              resolve({
                statusCode: 500,
                headers,
                body: JSON.stringify({
                  error: 'Upload failed',
                  message: error.message || 'Error processing upload result',
                  filename: filename
                })
              });
            }
          }
        );

        uploadStream.on('error', (error) => {
          console.error('❌ Upload stream error:', error);
          resolve({
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'Upload failed',
              message: error.message || 'Stream error',
              filename: filename
            })
          });
        });

        // Pipe the file stream directly to Cloudinary
        file.pipe(uploadStream);
      });

      busboy.on('error', (error) => {
        console.error('Busboy error:', error);
        resolve({
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'File upload error',
            message: error.message
          })
        });
      });

      // Parse the request body
      if (event.body) {
        const isBase64 = event.isBase64Encoded;
        const body = isBase64 ? Buffer.from(event.body, 'base64') : event.body;
        busboy.write(body, isBase64 ? undefined : 'utf8');
        busboy.end();
      } else {
        resolve({
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No file provided' })
        });
      }
    });
  } catch (error) {
    console.error('❌ Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Upload failed',
        message: error.message || 'Unknown error occurred'
      })
    };
  }
};
























