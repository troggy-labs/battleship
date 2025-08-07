# ⚓ Battleship - Multiplayer Naval Combat

A modern, real-time multiplayer Battleship game built with React, Node.js, and Socket.io. Features unique AI-generated backgrounds, explosive animations, and seamless mobile gameplay.

![Battleship Game](https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=400&fit=crop)

## 🎮 Features

- **Real-time Multiplayer**: Play against opponents worldwide with WebSocket technology
- **Smart Matchmaking**: Simple queue-based system pairs you with available players
- **Unique Backgrounds**: AI-generated ocean scenes using DALL-E for each game
- **Explosive Animations**: Satisfying visual effects for hits, misses, and ship destruction
- **Mobile Optimized**: Fully responsive design with touch controls
- **Reconnection Support**: Continue your game even after browser refresh
- **Turn Timer**: 60-second turns keep games moving
- **Classic Rules**: Standard Battleship gameplay with 5 ships per player

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key (optional, for custom backgrounds)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/battleship-game.git
   cd battleship-game
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment file
   cp server/.env.example server/.env
   
   # Add your OpenAI API key (optional)
   # OPENAI_API_KEY=your_api_key_here
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Game: http://localhost:3000
   - Server API: http://localhost:3001

## 🎯 How to Play

1. **Find a Battle**: Click "Find Battle" to join the matchmaking queue
2. **Place Your Fleet**: Drag and drop your 5 ships onto your board
   - Carrier (5 squares)
   - Battleship (4 squares)  
   - Cruiser (3 squares)
   - Submarine (3 squares)
   - Destroyer (2 squares)
3. **Ready Up**: Click "Ready to Play" when all ships are positioned
4. **Fire Away**: Take turns firing at your opponent's grid
5. **Victory**: Sink all enemy ships to win!

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Framer Motion** - Smooth animations
- **Socket.io Client** - Real-time communication
- **Vite** - Fast build tool and dev server

### Backend  
- **Node.js + Express** - Server runtime and framework
- **Socket.io** - WebSocket handling
- **TypeScript** - Shared type definitions
- **OpenAI API** - Background generation

### Development
- **Vitest** - Unit testing
- **React Testing Library** - Component testing
- **ESLint + Prettier** - Code quality

## 📁 Project Structure

```
battleship/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── styles/         # CSS modules
│   │   └── types/          # TypeScript definitions
│   └── public/             # Static assets
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Game logic
│   │   ├── services/       # Business logic
│   │   ├── sockets/        # WebSocket handlers
│   │   └── models/         # Data models
└── shared/                 # Shared TypeScript types
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run client tests only
npm run test:client

# Run server tests only  
npm run test:server

# Run tests with coverage
npm run test:coverage
```

## 🚢 Deployment

### Render.com (Recommended)

1. **Fork this repository**

2. **Connect to Render**
   - Create account at [render.com](https://render.com)
   - Connect your GitHub repository
   - Render will auto-detect the `render.yaml` configuration

3. **Set environment variables**
   ```
   NODE_ENV=production
   OPENAI_API_KEY=your_api_key_here (optional)
   ```

4. **Deploy**
   - Render automatically builds and deploys
   - Your game will be available at `https://your-app-name.onrender.com`

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

**Server (.env)**
```bash
PORT=3001                                    # Server port
NODE_ENV=production                          # Environment
CLIENT_URL=https://your-domain.com           # Client URL for CORS
OPENAI_API_KEY=sk-...                        # OpenAI API key (optional)
```

**Client**
- Automatically detects server URL based on environment
- Production: Uses same origin as client
- Development: Points to localhost:3001

## 🎨 Customization

### Backgrounds
- Default: Uses free stock images from Unsplash
- With OpenAI API: Generates unique PopCap-style backgrounds
- Custom: Replace fallback images in `BackgroundService.ts`

### Game Rules
- Modify ship sizes in `shared/types.ts`
- Adjust timers in game logic
- Customize board size (currently 10x10)

### Styling
- CSS Modules for component styles
- Global styles in `App.css`
- Mobile-first responsive design

## 🐛 Troubleshooting

### Common Issues

**"Connection Error"**
- Check if server is running on port 3001
- Verify firewall settings
- Ensure WebSocket connections aren't blocked

**"Game not found" on reconnect**
- Games cleanup after 2 minutes of inactivity
- Clear localStorage to reset saved game ID

**Ships won't place**
- Ensure ships don't overlap
- Check ships fit within board boundaries
- Try rotating ship orientation

### Debug Mode

Enable verbose logging:
```bash
# Server
DEBUG=battleship:* npm run dev:server

# Client  
VITE_DEBUG=true npm run dev:client
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see [LICENSE.md](LICENSE.md) for details.

## 🙏 Acknowledgments

- Classic Battleship game by Milton Bradley
- Ocean backgrounds from Unsplash
- PopCap Games for visual inspiration
- Socket.io team for real-time capabilities

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/battleship-game/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/battleship-game/discussions)
- **Email**: support@battleship-game.com

---

**Ready to command your fleet? ⚓ [Play Now](https://battleship-game.onrender.com)**