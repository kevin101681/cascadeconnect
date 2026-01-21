# Voice-to-Text Quick Reference
**Feature:** Chat Voice Input  
**Last Updated:** January 17, 2026

---

## For Users

### How to Use Voice Input

1. **Start Recording**
   - Click the microphone icon 🎤 next to the message input
   - Allow microphone permission when prompted (first time only)
   - Icon turns red and pulses while listening

2. **Speak Your Message**
   - Speak clearly into your microphone
   - Your words appear in real-time in the input field
   - You can continue typing to edit if needed

3. **Send Your Message**
   - Click the Send button ➤
   - Voice recording stops automatically
   - Message is sent like any other chat message

4. **Stop Recording Without Sending**
   - Click the red microphone icon again
   - Your transcript stays in the input field
   - Edit or delete as needed

---

## For Developers

### Quick Integration

**1. Import the Hook**
```typescript
import { useSpeechToText } from '@/lib/hooks/useSpeechToText';
```

**2. Use in Component**
```typescript
const { 
  isListening, 
  transcript, 
  startListening, 
  stopListening, 
  resetTranscript,
  isSupported,
  error 
} = useSpeechToText();
```

**3. Sync to Input**
```typescript
useEffect(() => {
  if (transcript) {
    setInputValue(transcript);
  }
}, [transcript]);
```

**4. Add UI Button**
```tsx
{isSupported && (
  <button 
    onClick={() => isListening ? stopListening() : startListening()}
    className={isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}
  >
    <Mic />
  </button>
)}
```

---

## API Reference

### Hook Return Values

| Property | Type | Description |
|----------|------|-------------|
| `isListening` | `boolean` | True when mic is active |
| `transcript` | `string` | Current recognized text |
| `startListening` | `() => void` | Begin voice input |
| `stopListening` | `() => void` | End voice input |
| `resetTranscript` | `() => void` | Clear transcript |
| `isSupported` | `boolean` | Browser compatibility check |
| `error` | `string \| null` | Error state |

### Error Values

- `'not-allowed'` - Microphone permission denied
- `'not-supported'` - Browser doesn't support Web Speech API
- `'start-failed'` - Failed to start recognition
- `'aborted'` - Recognition was manually stopped (not an error)
- Other strings - Browser-specific errors

---

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Native support |
| Edge | ✅ Full | Native support |
| Safari | ✅ Full | Uses webkit prefix |
| Firefox | ❌ None | Feature not available |
| Mobile Chrome | ✅ Full | Works on Android |
| Mobile Safari | ⚠️ Limited | iOS restrictions apply |

---

## Keyboard Shortcuts (Future)

Currently none. Planned:
- `Ctrl/Cmd + M` - Toggle microphone
- `Ctrl/Cmd + Enter` - Send message while recording

---

## Troubleshooting

### Button Not Visible
- Check browser compatibility
- Use Chrome, Edge, or Safari

### Permission Denied
1. Click site settings (lock icon in address bar)
2. Change microphone to "Allow"
3. Refresh the page

### No Transcript Appearing
- Check microphone volume
- Speak louder or closer to mic
- Check console for errors
- Try restarting browser

### Message Not Sending
- Check network connection
- Verify you're logged in
- Check console for auth errors

---

## Performance Tips

- **Battery:** Voice recognition uses more battery on mobile
- **Privacy:** Transcription happens locally in browser (not sent to Google/Apple until you send the message)
- **Accuracy:** Works best in quiet environments
- **Speed:** Real-time transcription with <100ms latency

---

## Files to Check

- **Hook:** `lib/hooks/useSpeechToText.ts`
- **UI:** `components/chat/ChatWindow.tsx`
- **Schema:** `db/schema/internal-chat.ts`
- **Service:** `services/internalChatService.ts`
- **Full Docs:** `VOICE-TO-TEXT-IMPLEMENTATION.md`
