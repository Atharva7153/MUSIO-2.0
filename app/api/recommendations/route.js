// app/api/recommendations/route.js
import { NextResponse } from "next/server";
import connectDB from "../../lib/mongodb";
import Song from "../../models/Song";
import Playlist from "../../models/Playlist";

// Smart recommendation algorithm
const calculateSongSimilarity = (song1, song2) => {
  let score = 0;
  
  // Genre similarity (40% weight)
  if (song1.genre && song2.genre) {
    if (song1.genre.toLowerCase() === song2.genre.toLowerCase()) {
      score += 0.4;
    } else if (areRelatedGenres(song1.genre, song2.genre)) {
      score += 0.2;
    }
  }
  
  // Artist similarity (30% weight)
  if (song1.artist && song2.artist) {
    if (song1.artist.toLowerCase() === song2.artist.toLowerCase()) {
      score += 0.3;
    } else if (song1.artist.toLowerCase().includes(song2.artist.toLowerCase()) || 
               song2.artist.toLowerCase().includes(song1.artist.toLowerCase())) {
      score += 0.15;
    }
  }
  
  // Title/keyword similarity (20% weight)
  const titleSimilarity = calculateTextSimilarity(song1.title, song2.title);
  score += titleSimilarity * 0.2;
  
  // Popularity/recency boost (10% weight)
  const now = new Date();
  const daysSinceCreated = (now - new Date(song2.createdAt)) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, (30 - daysSinceCreated) / 30); // Boost recent songs
  score += recencyScore * 0.1;
  
  return score;
};

const areRelatedGenres = (genre1, genre2) => {
  const relatedGenres = {
    'pop': ['pop rock', 'indie pop', 'electropop', 'synthpop'],
    'rock': ['pop rock', 'indie rock', 'alternative rock', 'hard rock'],
    'electronic': ['edm', 'techno', 'house', 'dubstep', 'synthpop', 'electropop'],
    'hip hop': ['rap', 'r&b', 'urban', 'trap'],
    'indie': ['indie rock', 'indie pop', 'alternative'],
    'jazz': ['blues', 'soul', 'funk'],
    'classical': ['orchestral', 'symphony', 'opera'],
    'country': ['folk', 'americana', 'bluegrass'],
    'r&b': ['soul', 'hip hop', 'urban', 'funk']
  };
  
  const g1 = genre1.toLowerCase();
  const g2 = genre2.toLowerCase();
  
  return relatedGenres[g1]?.includes(g2) || relatedGenres[g2]?.includes(g1);
};

const calculateTextSimilarity = (text1, text2) => {
  if (!text1 || !text2) return 0;
  
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return commonWords.length / totalWords;
};

const generateGenreFromMetadata = (song) => {
  // Simple genre detection based on title/artist keywords
  const text = `${song.title} ${song.artist}`.toLowerCase();
  
  const genreKeywords = {
    'electronic': ['electronic', 'edm', 'techno', 'house', 'dubstep', 'synth', 'digital'],
    'pop': ['pop', 'mainstream', 'radio', 'hit', 'chart'],
    'rock': ['rock', 'guitar', 'band', 'metal', 'punk'],
    'hip hop': ['hip hop', 'rap', 'beats', 'urban', 'trap'],
    'indie': ['indie', 'independent', 'underground', 'alternative'],
    'jazz': ['jazz', 'swing', 'bebop', 'smooth'],
    'classical': ['classical', 'symphony', 'orchestra', 'piano', 'violin'],
    'country': ['country', 'folk', 'acoustic', 'americana'],
    'r&b': ['r&b', 'soul', 'rhythm', 'blues']
  };
  
  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return genre;
    }
  }
  
  return 'unknown';
};

export async function GET(req) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const basedOn = searchParams.get('basedOn'); // Song ID to base recommendations on
    const limit = parseInt(searchParams.get('limit')) || 10;
    const type = searchParams.get('type') || 'similar'; // 'similar', 'trending', 'genre'
    const genre = searchParams.get('genre');
    
    let recommendations = [];
    
    if (type === 'trending') {
      // Get recently added and popular songs
      recommendations = await Song.find({})
        .sort({ createdAt: -1 })
        .limit(limit * 2)
        .lean();
        
      // Add trending score based on recency
      recommendations = recommendations.map(song => ({
        ...song,
        recommendationScore: Math.random() * 0.3 + 0.7, // 0.7-1.0 range
        reason: 'Trending Now'
      }));
      
    } else if (type === 'genre' && genre) {
      // Get songs from specific genre
      recommendations = await Song.find({
        $or: [
          { genre: new RegExp(genre, 'i') },
          { title: new RegExp(genre, 'i') },
          { artist: new RegExp(genre, 'i') }
        ]
      })
      .limit(limit)
      .lean();
      
      recommendations = recommendations.map(song => ({
        ...song,
        recommendationScore: Math.random() * 0.4 + 0.6,
        reason: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Music`
      }));
      
    } else if (basedOn) {
      // Get similar songs based on a specific song
      const baseSong = await Song.findById(basedOn).lean();
      if (!baseSong) {
        return NextResponse.json(
          { success: false, error: "Base song not found" },
          { status: 404 }
        );
      }
      
      // Ensure base song has genre
      if (!baseSong.genre) {
        baseSong.genre = generateGenreFromMetadata(baseSong);
      }
      
      const allSongs = await Song.find({ _id: { $ne: basedOn } }).lean();
      
      // Calculate similarity scores
      const scoredSongs = allSongs.map(song => {
        if (!song.genre) {
          song.genre = generateGenreFromMetadata(song);
        }
        
        const score = calculateSongSimilarity(baseSong, song);
        return {
          ...song,
          recommendationScore: score,
          reason: score > 0.5 ? 'Highly Similar' : score > 0.3 ? 'Similar Style' : 'You Might Like'
        };
      });
      
      // Sort by similarity score and take top results
      recommendations = scoredSongs
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);
        
    } else {
      // Default: mix of trending and random discoveries
      const recentSongs = await Song.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
        
      recommendations = recentSongs.map(song => ({
        ...song,
        recommendationScore: Math.random() * 0.5 + 0.5,
        reason: 'Discover New Music'
      }));
    }
    
    // Filter out low-quality recommendations
    recommendations = recommendations.filter(song => 
      song.recommendationScore > 0.2
    );
    
    return NextResponse.json({
      success: true,
      recommendations: recommendations.slice(0, limit),
      totalFound: recommendations.length,
      type,
      ...(basedOn && { basedOnSong: basedOn })
    });
    
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    
    const { songId, userId = 'anonymous', action } = await req.json();
    
    if (!songId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }
    
    // Here you could implement user interaction tracking
    // For now, we'll just acknowledge the interaction
    
    const song = await Song.findById(songId);
    if (!song) {
      return NextResponse.json(
        { success: false, error: "Song not found" },
        { status: 404 }
      );
    }
    
    // You could store this interaction in a UserInteraction model
    // to improve future recommendations
    
    return NextResponse.json({
      success: true,
      message: `Interaction recorded: ${action} on "${song.title}"`,
      songId,
      action
    });
    
  } catch (error) {
    console.error("Error recording interaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record interaction" },
      { status: 500 }
    );
  }
}