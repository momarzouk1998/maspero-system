// Utility functions for user filtering
// Hide deleted/inactive users from all pages except user management

export function getActiveUsers(users: any[]): any[] {
  return users.filter(u => u.is_active !== false && u.is_active !== 'false');
}

export function isUserActive(user: any): boolean {
  return user?.is_active !== false && user?.is_active !== 'false';
}
