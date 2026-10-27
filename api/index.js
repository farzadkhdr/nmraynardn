import express from 'express';
import cors from 'cors';
import { kv } from '@vercel/kv';

const app = express();

// ⚠️ دوای دیپلۆی قوتابی، ئەمە بگۆڕە بۆ دۆمەینی ڕاستەقینە
// بۆ تاقیکردنەوە '*' بهێڵەوە
app.use(cors({ origin: '*' }));
app.use(express.json());

// ✅ API بۆ بارکردنی نمرە لەلایەن مامۆستا
app.post('/api/scores', async (req, res) => {
  try {
    const { studentId, course, score } = req.body;

    if (!studentId || !course || score === undefined) {
      return res.status(400).json({ error: 'داتای ناتەواو' });
    }

    const key = `scores:${studentId}`;
    const existing = (await kv.get(key)) || [];

    const index = existing.findIndex(s => s.course === course);
    if (index > -1) {
      existing[index].score = Number(score);
    } else {
      existing.push({ course, score: Number(score) });
    }

    await kv.set(key, existing);

    // زیادکردنی قوتابی بۆ لیست (بۆ بینینی هەمووان)
    const students = (await kv.get('students:list')) || [];
    if (!students.includes(studentId)) {
      students.push(studentId);
      await kv.set('students:list', students);
    }

    res.json({ message: 'نمرە بارکرا', data: { studentId, course, score } });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'هەڵەی سەرڤەر' });
  }
});

// ✅ API بۆ قوتابی: وەرگرتنی نمرەکان
app.get('/api/scores/:studentId', async (req, res) => {
  try {
    const list = (await kv.get(`scores:${req.params.studentId}`)) || [];
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'هەڵەی سەرڤەر' });
  }
});

// ✅ API بۆ مامۆستا: بینینی هەموو نمرەکان
app.get('/api/all-scores', async (req, res) => {
  try {
    const students = (await kv.get('students:list')) || [];
    const allScores = [];

    for (const studentId of students) {
      const scores = (await kv.get(`scores:${studentId}`)) || [];
      for (const s of scores) {
        allScores.push({ studentId, course: s.course, score: s.score });
      }
    }

    res.json(allScores);
  } catch (error) {
    res.status(500).json({ error: 'هەڵەی سەرڤەر' });
  }
});

export default app;
