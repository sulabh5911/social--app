import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FiBell, FiBookmark, FiCompass, FiEye, FiEyeOff, FiHeart, FiHome, FiImage, FiLogOut, FiMessageCircle, FiMoreHorizontal, FiPlus, FiSearch, FiSend, FiSmile } from 'react-icons/fi';
import './styles.css';

const seedPosts = [
  { id: '1', author: { name: 'Maya Patel', avatar: 'https://i.pravatar.cc/100?img=47' }, text: 'Small steps every day add up to big changes. What is everyone working on this week? ✨', image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1000&q=80', likes: ['other'], comments: [{ authorName: 'Alex Chen', text: 'This is exactly what I needed to hear today.' }] },
  { id: '2', author: { name: 'Jordan Lee', avatar: 'https://i.pravatar.cc/100?img=12' }, text: 'Just finished my morning run. Feeling ready to make today count!', image: '', likes: [], comments: [] }
];

const api = async (path, options = {}) => {
  const token = localStorage.getItem('taskplanet-token');
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  if (!response.ok) throw new Error((await response.json()).message || 'Something went wrong.');
  return response.json();
};

function Auth({ onAuth }) {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = () => setShowPassword((visible) => !visible);
  const submit = async (event) => {
    event.preventDefault(); setError('');
    try { const data = await api(`/auth/${isSignup ? 'signup' : 'login'}`, { method: 'POST', body: JSON.stringify(form) }); localStorage.setItem('taskplanet-token', data.token); onAuth(data.user); }
    catch (err) {
      if (err instanceof TypeError) {
        const demoUser = { id: 'me', name: form.name || 'Demo Creator', email: form.email, avatar: `https://i.pravatar.cc/100?u=${encodeURIComponent(form.email)}` };
        localStorage.setItem('taskplanet-token', 'demo-mode');
        onAuth(demoUser);
      } else setError(err.message);
    }
  };
  return <main className="auth-shell"><section className="auth-card"><div className="brand"><span className="brand-mark">✦</span><span>task<span>planet</span></span></div><div className="auth-copy"><p className="eyebrow">WELCOME BACK</p><h1>{isSignup ? 'Join your community.' : 'Make space for good ideas.'}</h1><p>Connect, share progress, and find inspiration from people moving forward.</p></div><form onSubmit={submit}>{isSignup && <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>}<label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label><label>Password<div className="password-field"><input required minLength="6" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" /><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={togglePassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <FiEye /> : <FiEyeOff />}</button></div></label>{error && <p className="error">{error}</p>}<button className="primary-button" type="submit">{isSignup ? 'Create account' : 'Log in'} <FiSend /></button></form><p className="switch-auth">{isSignup ? 'Already have an account?' : 'New to TaskPlanet?'} <button onClick={() => { setIsSignup(!isSignup); setShowPassword(false); setError(''); }}>{isSignup ? 'Log in' : 'Create an account'}</button></p></section><div className="auth-art"><div className="art-card card-one"><FiHeart /><strong>Good energy</strong><span>is always worth sharing</span></div><div className="art-card card-two"><FiCompass /><strong>Find your people</strong><span>and grow together</span></div><div className="art-orb">✦</div></div></main>;
}

function PostCard({ post, user, onLike, onComment }) {
  const [comment, setComment] = useState('');
  const liked = post.likes?.includes(user.id) || post.likes?.includes('me');
  const submit = async (e) => { e.preventDefault(); if (!comment.trim()) return; await onComment(post.id, comment); setComment(''); };
  return <article className="post-card"><header className="post-header"><img src={post.author.avatar} alt="" /><div><strong>{post.author.name}</strong><span>{post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today'} · 🌎</span></div><button className="icon-button"><FiMoreHorizontal /></button></header><p className="post-text">{post.text}</p>{post.image && <img className="post-image" src={post.image} alt="Shared post" />}<div className="post-actions"><button className={liked ? 'liked' : ''} onClick={() => onLike(post.id)}><FiHeart /> {post.likes?.length || 0}</button><button><FiMessageCircle /> {post.comments?.length || 0}</button><button className="save-button"><FiBookmark /></button></div>{post.comments?.length > 0 && <div className="comments">{post.comments.slice(-2).map((item, index) => <p key={index}><b>{item.authorName || 'Friend'}</b> {item.text}</p>)}</div>}<form className="comment-form" onSubmit={submit}><img src={user.avatar} alt="" /><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a thoughtful comment..." /><button aria-label="Post comment"><FiSend /></button></form></article>;
}

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('taskplanet-user') || 'null'));
  const [posts, setPosts] = useState(seedPosts);
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [activeNav, setActiveNav] = useState('Home');
  const [notice, setNotice] = useState('');
  const displayUser = user || { id: 'me', name: 'You', avatar: 'https://i.pravatar.cc/100?img=32' };
  useEffect(() => { if (user) { localStorage.setItem('taskplanet-user', JSON.stringify(user)); api('/posts').then(setPosts).catch(() => {}); } }, [user]);
  const sortedPosts = useMemo(() => posts, [posts]);
  if (!user) return <Auth onAuth={setUser} />;
  const publish = async (event) => { event.preventDefault(); if (!text.trim() && !image.trim()) return; try { const post = await api('/posts', { method: 'POST', body: JSON.stringify({ text, image }) }); setPosts([post, ...posts]); } catch { setPosts([{ id: crypto.randomUUID(), author: displayUser, text, image, likes: [], comments: [] }, ...posts]); } setText(''); setImage(''); setNotice('Your post is live!'); setTimeout(() => setNotice(''), 2500); };
  const like = async (id) => { try { const data = await api(`/posts/${id}/like`, { method: 'POST' }); setPosts(posts.map((post) => post.id === id ? { ...post, likes: data.likes } : post)); } catch { setPosts(posts.map((post) => post.id === id ? { ...post, likes: post.likes.includes('me') ? post.likes.filter((item) => item !== 'me') : [...post.likes, 'me'] } : post)); } };
  const comment = async (id, value) => { try { const data = await api(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ text: value }) }); setPosts(posts.map((post) => post.id === id ? { ...post, comments: [...post.comments, data.comment] } : post)); } catch { setPosts(posts.map((post) => post.id === id ? { ...post, comments: [...post.comments, { authorName: displayUser.name, text: value }] } : post)); } };
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">✦</span><span>task<span>planet</span></span></div><nav>{[['Home', FiHome], ['Explore', FiCompass], ['Notifications', FiBell], ['Bookmarks', FiBookmark]].map(([label, Icon]) => <button className={activeNav === label ? 'nav-item active' : 'nav-item'} onClick={() => setActiveNav(label)} key={label}><Icon /> {label}{label === 'Notifications' && <i>3</i>}</button>)}</nav><button className="profile-mini"><img src={displayUser.avatar} alt="" /><span><b>{displayUser.name}</b><small>View profile</small></span><FiMoreHorizontal /></button><button className="logout" onClick={() => { localStorage.clear(); setUser(null); }}><FiLogOut /> Log out</button></aside><main className="feed"><header className="feed-header"><div><p className="eyebrow">SATURDAY, SEPTEMBER 5</p><h1>Good afternoon, {displayUser.name.split(' ')[0]} <span>👋</span></h1></div><button className="search-button"><FiSearch /></button></header><section className="composer"><div className="composer-top"><img src={displayUser.avatar} alt="" /><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share something with your community..." rows="2" /></div>{image && <div className="image-preview"><img src={image} alt="Preview" /><button onClick={() => setImage('')}>Remove</button></div>}<div className="composer-actions"><button onClick={() => document.getElementById('image-url').focus()}><FiImage /> Add image</button><button><FiSmile /> Feeling good</button><input id="image-url" className="image-input" value={image} onChange={(e) => setImage(e.target.value)} placeholder="Paste image URL" /><button className="publish-button" onClick={publish}><FiSend /> Post</button></div></section>{notice && <div className="notice">{notice}</div>}<div className="feed-title"><h2>Community feed</h2><button>Latest <span>⌄</span></button></div>{activeNav === 'Home' ? <div className="posts">{sortedPosts.map((post) => <PostCard key={post.id} post={post} user={displayUser} onLike={like} onComment={comment} />)}</div> : <div className="empty-state"><FiCompass /><h2>{activeNav}</h2><p>This space is ready for your next discovery.</p></div>}</main><aside className="right-rail"><section className="welcome-panel"><span className="panel-icon">✦</span><h3>Make today meaningful.</h3><p>Share your progress and cheer on someone else's.</p><button onClick={() => document.querySelector('textarea').focus()}>Create a post <FiPlus /></button></section><section className="people-panel"><div className="panel-heading"><h3>People to follow</h3><button>See all</button></div>{[['Priya Shah', 'Designing with intention', 5], ['Ethan Brooks', 'Building in public', 14], ['Sara Kim', 'Finding balance', 32]].map(([name, bio, img]) => <div className="person" key={name}><img src={`https://i.pravatar.cc/100?img=${img}`} alt="" /><span><b>{name}</b><small>{bio}</small></span><button>+</button></div>)}</section><p className="footer-note">© 2024 TaskPlanet · Made for meaningful connections</p></aside></div>;
}

createRoot(document.getElementById('root')).render(<App />);
