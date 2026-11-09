import { apiPost } from './api';

export const startConversation = async (currentUser, otherUser) => {
  if (currentUser.uid === otherUser.uid) {
    throw new Error("You cannot message yourself");
  }

  const conversation = await apiPost('/api/conversations', {
    userId: currentUser.uid,
    userName: currentUser.displayName,
    userAvatar: currentUser.photoURL || '',
    otherUserId: otherUser.uid,
    otherUserName: otherUser.displayName,
    otherUserAvatar: otherUser.photoURL || '',
    listingId: otherUser.listingId,
    listingTitle: otherUser.listingTitle,
  });

  return conversation.id;
};
