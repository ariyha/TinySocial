export interface User {
  userID: string;
  name: string;
}

export interface Post {
  postId: number;
  userId: string;
  name: string;
  title: string;
  date: string;
  time: string;
  content: string;
  shared: boolean;
  hashtags?: string[];
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}
