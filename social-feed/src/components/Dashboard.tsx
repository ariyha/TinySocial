import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import PostCard from './PostCard';
import CreatePost from './CreatePost';
import { Post } from '../types';

const Dashboard: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'profile'>('feed');
  const [followUsername, setFollowUsername] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [followMessage, setFollowMessage] = useState('');
  const { user, logout } = useAuth();

  const fetchFeed = async () => {
    if (!user) return;
    try {
      const feedData = await api.getUserFeed(user.userID, 10);
      setPosts(Array.isArray(feedData) ? feedData : []);
    } catch (err) {
      console.error('Failed to fetch feed:', err);
      setPosts([]);
    }
  };

  const fetchUserPosts = async () => {
    if (!user) return;
    try {
      const postsData = await api.getUserPosts(user.userID, 10);
      setUserPosts(Array.isArray(postsData) ? postsData : []);
    } catch (err) {
      console.error('Failed to fetch user posts:', err);
      setUserPosts([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFeed(), fetchUserPosts()]);
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handlePostCreated = () => {
    fetchUserPosts();
    fetchFeed();
  };

  const handleShare = async (postId: number) => {
    if (!user) return;
    try {
      await api.sharePost(user.userID, postId);
      fetchFeed();
      fetchUserPosts();
    } catch (err) {
      console.error('Failed to share post:', err);
    }
  };

  const handleFollow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !followUsername.trim()) return;

    setFollowLoading(true);
    setFollowMessage('');

    try {
      const response = await api.followUser(user.userID, followUsername.trim());
      if (response.message && response.message.includes('SUCCESSFULLY')) {
        setFollowMessage(`Successfully followed @${followUsername}`);
        setFollowUsername('');
        fetchFeed(); // Refresh feed to show new posts
      } else {
        setFollowMessage('Failed to follow user. Please try again.');
      }
    } catch (err) {
      setFollowMessage('Failed to follow user. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700 flex items-center justify-center">
        <div className="animate-pulse-soft">
          <div className="w-16 h-16 border-4 border-neutral-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700">
      {/* Header */}
      <header className="glass-effect border-b border-neutral-500/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-emerald-400">TinySocial</h1>
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('feed')}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeTab === 'feed'
                      ? 'bg-emerald-600 text-white'
                      : 'text-neutral-300 hover:bg-dark-700/50'
                  }`}
                >
                  Feed
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeTab === 'profile'
                      ? 'bg-emerald-600 text-white'
                      : 'text-neutral-300 hover:bg-dark-700/50'
                  }`}
                >
                  Profile
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-neutral-300">
                Welcome, <span className="font-semibold">{user?.name}</span>
              </div>
              <button
                onClick={logout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'feed' ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-neutral-200 mb-4">Your Feed</h2>
                  {posts.length === 0 ? (
                    <div className="glass-effect rounded-xl p-8 text-center">
                      <div className="text-neutral-400 mb-4">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="text-neutral-300 text-lg">Your feed is empty</p>
                      <p className="text-neutral-500 mt-2">Follow some users to see their posts here!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <PostCard
                          key={post.postId}
                          post={post}
                          onShare={handleShare}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <CreatePost onPostCreated={handlePostCreated} />
                
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-neutral-200 mb-4">Your Posts</h2>
                  {userPosts.length === 0 ? (
                    <div className="glass-effect rounded-xl p-8 text-center">
                      <div className="text-neutral-400 mb-4">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <p className="text-neutral-300 text-lg">You haven't posted anything yet</p>
                      <p className="text-neutral-500 mt-2">Share your first thought with the world!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userPosts.map((post) => (
                        <PostCard
                          key={post.postId}
                          post={post}
                          onShare={handleShare}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Follow Users */}
            <div className="glass-effect rounded-xl p-6">
              <h3 className="text-lg font-semibold text-neutral-200 mb-4">Follow Users</h3>
              <form onSubmit={handleFollow} className="space-y-4">
                <input
                  type="text"
                  value={followUsername}
                  onChange={(e) => setFollowUsername(e.target.value)}
                  placeholder="Username to follow"
                  className="w-full px-3 py-2 bg-dark-700/50 border border-neutral-500/30 rounded-lg text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={followLoading || !followUsername.trim()}
                  className="w-full btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {followLoading ? 'Following...' : 'Follow'}
                </button>
              </form>
              {followMessage && (
                <div className={`mt-3 text-sm p-2 rounded-lg ${
                  followMessage.includes('Successfully') 
                    ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20'
                    : 'text-red-400 bg-red-400/10 border border-red-400/20'
                }`}>
                  {followMessage}
                </div>
              )}
            </div>

            {/* User Stats */}
            <div className="glass-effect rounded-xl p-6">
              <h3 className="text-lg font-semibold text-emerald-300 mb-4">Your Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-emerald-200/70">Posts</span>
                  <span className="text-emerald-400 font-semibold">{userPosts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-200/70">Feed Posts</span>
                  <span className="text-emerald-400 font-semibold">{posts.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
