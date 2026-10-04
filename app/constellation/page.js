"use client";
import { useEffect, useState } from "react";
import SonicConstellationMap from "../components/SonicConstellationMap";

export default function ConstellationPage() {
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    fetch("/api/songs/all")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.songs)) {
          setSongs(data.songs);
        }
      })
      .catch(() => {});
  }, []);

  return <SonicConstellationMap songs={songs} />;
}
