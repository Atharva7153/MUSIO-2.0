# 🎵 Musio - Modern Music Streaming Platform

A beautiful, modern music streaming application built with Next.js 15, featuring a sleek UI with glassmorphism effects, animated gradients, and a full-featured music player.

![Musio](https://img.shields.io/badge/Musio-Music%20Streaming-blue?style=for-the-badge&logo=spotify)
![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.1.0-blue?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Cloud%20Storage-orange?style=for-the-badge&logo=cloudinary)

## ✨ Features

### 🎨 **Modern UI/UX**
- **Glassmorphism Design** - Beautiful frosted glass effects throughout the app
- **Animated Gradients** - Dynamic background animations with smooth color transitions
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Dark Theme** - Elegant dark color scheme with vibrant accents
- **Smooth Animations** - Hover effects, transitions, and micro-interactions

### 🎵 **Music Player**
- **Floating Playbar** - Always-accessible player that sits on top of content
- **Full Playback Controls** - Play/pause, previous/next, shuffle, and repeat
- **Progress Bar** - Interactive seek bar with time display
- **Continuous Gradient Animations** - Beautiful animated buttons with flowing colors
- **Song Information** - Display of current song title, artist, and cover art

### 📱 **Core Functionality**
- **Playlist Management** - Create and organize music playlists
- **Song Upload** - Upload audio files with cover images
- **Search Functionality** - Find songs across all playlists
- **Responsive Layout** - 2-row horizontal scrolling playlist display
- **Real-time Updates** - Dynamic content updates without page refresh

### 🗄️ **Backend Features**
- **MongoDB Integration** - Robust database for songs and playlists
- **Cloudinary Storage** - Cloud-based file storage for audio and images
- **RESTful API** - Clean API endpoints for data management
- **File Upload** - Support for multiple audio formats and image types

## 🚀 Tech Stack

### **Frontend**
- **Next.js 15.5.2** - React framework with App Router
- **React 19.1.0** - Latest React with concurrent features
- **CSS3** - Custom styling with animations and responsive design
- **Context API** - Global state management for music player

### **Backend**
- **MongoDB** - NoSQL database with Mongoose ODM
- **Cloudinary** - Cloud storage for audio files and images
- **Next.js API Routes** - Serverless API endpoints

### **Development Tools**
- **Turbopack** - Fast bundler for development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hot Toast** - Beautiful toast notifications
- **Lucide React** - Modern icon library

## 📁 Project Structure

```
musio/
├── app/
│   ├── api/                    # API routes
│   │   ├── playlist/          # Playlist management
│   │   ├── playlists/         # Get all playlists
│   │   ├── songs/             # Song search
│   │   └── upload/            # File upload endpoint
│   ├── components/            # Reusable components
│   │   ├── Navbar.jsx         # Navigation bar
│   │   └── Playbar.js         # Music player
│   ├── context/               # React Context
│   │   └── PlayerContext.js   # Global player state
│   ├── lib/                   # Utilities
│   │   └── mongodb.js         # Database connection
│   ├── models/                # Database models
│   │   ├── Playlist.js        # Playlist schema
│   │   └── Song.js            # Song schema
│   ├── playlist/              # Playlist pages
│   │   └── [id]/              # Dynamic playlist routes
│   ├── styles/                # Custom CSS
│   │   └── Homepage.css       # Homepage styles
│   ├── upload/                # Upload page
│   ├── globals.css            # Global styles
│   ├── layout.js              # Root layout
│   └── page.js                # Homepage
├── public/                    # Static assets
├── package.json               # Dependencies
└── README.md                  # Documentation
```

## 🛠️ Installation & Setup

### **Prerequisites**
- Node.js 18+ 
- MongoDB Atlas account
- Cloudinary account

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd musio
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Environment Variables**
Create a `.env.local` file in the root directory:

```env
# MongoDB
MONGO_URI=your_mongodb_atlas_connection_string

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### **4. Run Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🎯 Usage

### **Homepage**
- View all available playlists in a beautiful 2-row grid
- Horizontal scrolling for playlists that exceed viewport width
- Click on any playlist to view its songs

### **Upload Music**
1. Navigate to the Upload page
2. Fill in song details (title, artist)
3. Upload audio file (MP3, WAV, etc.)
4. Optionally upload cover image
5. Choose existing playlist or create new one
6. Submit to add song to library

### **Playlist Management**
- View individual playlists with song details
- Click on any song to start playback
- Use the floating playbar for full playback control

### **Music Player**
- **Progress Bar** - Located at top of playbar for easy access
- **Play/Pause** - Center button with gradient animation
- **Navigation** - Previous/Next buttons flanking play button
- **Shuffle/Repeat** - Located at opposite ends for easy access
- **Seek** - Click on progress bar to jump to specific time

## 🎨 Design Features

### **Color Scheme**
- **Primary Gradient**: `#4a5568 → #2d3748 → #553c9a → #b794f4 → #4299e1`
- **Accent Colors**: Purple and blue tones for buttons and highlights
- **Background**: Animated gradient with smooth transitions

### **UI Components**
- **Glassmorphism Cards** - Semi-transparent backgrounds with blur effects
- **Animated Buttons** - Continuous gradient animations on hover
- **Responsive Grid** - Adaptive layouts for different screen sizes
- **Smooth Transitions** - CSS animations for enhanced user experience

### **Typography**
- **Primary Font**: Poppins (Google Fonts)
- **Secondary Font**: Inter (System fonts)
- **Gradient Text** - Beautiful gradient effects on titles

## 🔧 API Endpoints

### **GET /api/playlists**
Returns all playlists with song counts.

### **GET /api/playlist/[id]**
Returns specific playlist with all songs.

### **GET /api/songs/search?q=[query]**
Search songs by title or artist.

### **POST /api/upload**
Upload new song with optional playlist creation.

## 🗄️ Database Schema

### **Song Model**
```javascript
{
  title: String (required),
  artist: String (required),
  url: String (required),
  coverImage: String (optional),
  timestamps: true
}
```

### **Playlist Model**
```javascript
{
  name: String (required),
  coverImage: String (required),
  songs: [ObjectId] (references to Song),
  timestamps: true
}
```

## 🚀 Deployment

### **Vercel (Recommended)**
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### **Other Platforms**
- **Netlify** - Static site hosting
- **Railway** - Full-stack deployment
- **DigitalOcean** - VPS deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Atharva Sharma**

- **GitHub**: [@atharva-sharma](https://github.com/atharva-sharma)
- **Project**: Musio Music Streaming Platform

## 🙏 Acknowledgments

- **Next.js Team** - For the amazing React framework
- **MongoDB** - For the robust database solution
- **Cloudinary** - For cloud storage services
- **React Community** - For the excellent ecosystem

---

⭐ **Star this repository if you found it helpful!**

🎵 **Made with ❤️ by Atharva Sharma**
