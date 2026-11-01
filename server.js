const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
app.use(express.static(path.join(__dirname, "public")));

let rooms = {};
let saved = { games: [] };
try { saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch {}
function persist() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(saved, null, 2));
}
function code() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}
function clean(s) { return String(s || "").trim().slice(0, 80); }
function publicRoom(room) {
  return {
    code: room.code, videoId: room.videoId, videoUrl: room.videoUrl,
    question: room.question, questionOpen: room.questionOpen,
    players: Object.values(room.players).map(p => ({
      id: p.id, name: p.name, score: p.score,
      answered: Boolean(p.answers[room.question])
    })).sort((a,b) => b.score-a.score || a.name.localeCompare(b.name)),
    history: Object.values(room.players).map(p => ({
      name: p.name, answers: Object.entries(p.answers).map(([q,a]) => ({
        question: Number(q), answer: a.text, correct: a.correct, points: a.points
      })).sort((a,b) => a.question-b.question)
    }))
  };
}
function broadcast(room) { io.to(room.code).emit("state", publicRoom(room)); }

io.on("connection", socket => {
  socket.on("host:create", ({ videoUrl }) => {
    const match = String(videoUrl || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (!match) return socket.emit("errorMsg", "Enter a valid YouTube video URL.");
    let roomCode;
    do { roomCode = code(); } while (rooms[roomCode]);
    const room = rooms[roomCode] = {
      code: roomCode, videoId: match[1], videoUrl, host: socket.id,
      question: 1, questionOpen: true, players: {}, answerKey: {}
    };
    socket.join(roomCode);
    socket.emit("created", { code: roomCode });
    broadcast(room);
  });

  socket.on("player:join", ({ code: rawCode, name }) => {
    const roomCode = clean(rawCode).toUpperCase();
    const room = rooms[roomCode];
    if (!room) return socket.emit("errorMsg", "Room not found. Check the code.");
    const playerName = clean(name);
    if (!playerName) return socket.emit("errorMsg", "Enter a player name.");
    const id = socket.id;
    room.players[id] = { id, name: playerName, score: 0, answers: {} };
    socket.data.roomCode = roomCode;
    socket.join(roomCode);
    socket.emit("joined", { code: roomCode });
    broadcast(room);
  });

  socket.on("host:question", ({ question }) => {
    const room = rooms[socket.data.roomCode] || Object.values(rooms).find(r => r.host === socket.id);
    if (!room || room.host !== socket.id) return;
    room.question = Math.max(1, Math.min(999, Number(question) || room.question));
    room.questionOpen = true;
    broadcast(room);
  });

  socket.on("host:close", () => {
    const room = Object.values(rooms).find(r => r.host === socket.id);
    if (!room) return;
    room.questionOpen = false;
    broadcast(room);
  });

  socket.on("host:key", ({ answer, points }) => {
    const room = Object.values(rooms).find(r => r.host === socket.id);
    if (!room) return;
    room.answerKey[room.question] = {
      answers: String(answer || "").split("|").map(s => s.trim().toLowerCase()).filter(Boolean),
      points: Math.max(0, Math.min(1000, Number(points) || 1))
    };
    for (const p of Object.values(room.players)) {
      const entry = p.answers[room.question];
      if (entry) {
        const correct = room.answerKey[room.question].answers.includes(entry.text.trim().toLowerCase());
        const delta = correct ? room.answerKey[room.question].points : 0;
        p.score += delta - (entry.points || 0);
        entry.correct = correct;
        entry.points = delta;
      }
    }
    broadcast(room);
  });

  socket.on("player:answer", ({ answer }) => {
    const room = rooms[socket.data.roomCode];
    if (!room) return;
    const p = room.players[socket.id];
    if (!p || !room.questionOpen) return socket.emit("errorMsg", "This question is closed.");
    if (p.answers[room.question]) return socket.emit("errorMsg", "You have already submitted an answer for this question.");
    const text = clean(answer);
    if (!text) return socket.emit("errorMsg", "Type an answer first.");
    const key = room.answerKey[room.question];
    const correct = key ? key.answers.includes(text.toLowerCase()) : false;
    const points = correct && key ? key.points : 0;
    p.answers[room.question] = { text, correct: key ? correct : null, points };
    p.score += points;
    socket.emit("answerSaved", { message: "Answer submitted." });
    broadcast(room);
  });

  socket.on("host:finish", () => {
    const room = Object.values(rooms).find(r => r.host === socket.id);
    if (!room) return;
    room.questionOpen = false;
    const snapshot = {
      date: new Date().toISOString(), code: room.code, videoUrl: room.videoUrl,
      players: Object.values(room.players).map(p => ({
        name: p.name, score: p.score,
        answers: Object.entries(p.answers).map(([q,a]) => ({
          question: Number(q), answer: a.text, correct: a.correct, points: a.points
        })).sort((a,b) => a.question-b.question)
      }))
    };
    saved.games.unshift(snapshot);
    persist();
    io.to(room.code).emit("finished", snapshot);
    broadcast(room);
  });

  socket.on("host:history", () => {
    if (Object.values(rooms).some(r => r.host === socket.id))
      socket.emit("history", saved.games);
  });
  socket.on("disconnect", () => {
    for (const room of Object.values(rooms)) {
      if (room.players[socket.id]) { delete room.players[socket.id]; broadcast(room); }
    }
  });
});

server.listen(PORT, () => console.log(`Anime Quiz Live running on http://localhost:${PORT}`));
