import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const app = express();
app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' }
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, trim: true, default: '' },
  image: { type: String, trim: true, default: '' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);
const JWT_SECRET = process.env.JWT_SECRET || 'taskplanet-development-secret';

function tokenFor(user) {
  return jwt.sign({ id: user._id.toString(), name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
}

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ message: 'Name, email, and a 6+ character password are required.' });
  if (await User.exists({ email })) return res.status(409).json({ message: 'An account with that email already exists.' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), avatar: `https://i.pravatar.cc/100?u=${encodeURIComponent(email)}` });
  res.status(201).json({ token: tokenFor(user), user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
});

app.post('/api/auth/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.json({ token: tokenFor(user), user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
});

app.get('/api/posts', auth, async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 }).limit(30).populate('author', 'name avatar');
  res.json(posts.map((post) => ({
    id: post._id, text: post.text, image: post.image, createdAt: post.createdAt,
    author: post.author, likes: post.likes.map(String), comments: post.comments
  })));
});

app.post('/api/posts', auth, async (req, res) => {
  if (!req.body.text?.trim() && !req.body.image?.trim()) return res.status(400).json({ message: 'Add some text or an image link to publish.' });
  const post = await Post.create({ author: req.user.id, text: req.body.text?.trim(), image: req.body.image?.trim() });
  await post.populate('author', 'name avatar');
  res.status(201).json({ id: post._id, text: post.text, image: post.image, createdAt: post.createdAt, author: post.author, likes: [], comments: [] });
});

app.post('/api/posts/:id/like', auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found.' });
  const index = post.likes.findIndex((id) => id.toString() === req.user.id);
  index === -1 ? post.likes.push(req.user.id) : post.likes.splice(index, 1);
  await post.save();
  res.json({ likes: post.likes.map(String) });
});

app.post('/api/posts/:id/comments', auth, async (req, res) => {
  if (!req.body.text?.trim()) return res.status(400).json({ message: 'Comment cannot be empty.' });
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found.' });
  post.comments.push({ author: req.user.id, authorName: req.user.name, text: req.body.text.trim() });
  await post.save();
  res.status(201).json({ comment: post.comments.at(-1) });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(port, '0.0.0.0', () => console.log(`API listening on ${port}`)))
  .catch((error) => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
