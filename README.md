# AIBox — React Native App (JavaScript)

Nền tảng AI Marketplace + Prediction Market + Token Trading, xây bằng React Native (Expo) + JavaScript.

## Cài đặt

```bash
cd aibox-app
npm install
npx expo start
```

Quét QR code bằng Expo Go app trên điện thoại, hoặc nhấn `a` (Android), `i` (iOS).

## Tính năng

1. **AI Hub** — 12 model AI (GPT-4o, Claude 3.5, Gemini Pro, DALL-E 3, Midjourney...) — chat interface, mỗi call tốn token
2. **Markets** — 12 prediction markets (thể thao, crypto, tech, giải trí...) — mua YES/NO shares bằng token
3. **Portfolio** — positions + P&L + transaction history thống nhất (AI calls + trades + transfers)
4. **Transfer** — chuyển token cho người dùng khác
5. **Leaderboard** — top 20 users
6. **Daily Reward** — nhận 2,000 token miễn phí mỗi ngày + streak bonus
7. **Profile** — stats, win rate, reset token (demo), resolve random market (demo)

## Cấu trúc project

```
aibox-app/
  src/
    components/   (9 components .jsx)
    screens/      (8 screens .jsx)
    data/         (mockData.js — 12 AI models, 12 markets, 20 users)
    context/      (AppContext.jsx — global state + AsyncStorage)
    utils/        (format.js)
    navigation/   (AppNavigator.jsx)
  App.js
  package.json
  app.json
  babel.config.js
```

## Tech Stack

- **JavaScript** (không TypeScript)
- React Native (Expo)
- React Navigation (bottom tabs + stack)
- AsyncStorage (persist state)
- React Native SVG (charts)
- Dark mode UI

## Disclaimer

AIBox là nền tảng giải trí. Token là credit nội bộ, KHÔNG có giá trị tiền tệ. Prediction market là game dự đoán, không phải cá cược.
