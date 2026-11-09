import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

async function deleteMatching(database, name, field, value) {
  const snapshot = await getDocs(query(collection(database, name), where(field, '==', value)));
  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
}

export async function removeFirestoreAccount(database, uid) {
  const steps = [
    () => deleteMatching(database, 'posts', 'authorId', uid),
    () => deleteMatching(database, 'comments', 'authorId', uid),
    () => deleteMatching(database, 'reviews', 'authorId', uid),
    () => deleteMatching(database, 'listings', 'vendorId', uid),
    async () => {
      const conversations = await getDocs(
        query(collection(database, 'conversations'), where('participants', 'array-contains', uid))
      );
      for (const conversation of conversations.docs) {
        const messages = await getDocs(collection(database, 'conversations', conversation.id, 'messages'));
        await Promise.all(messages.docs.map((message) => deleteDoc(message.ref)));
        await deleteDoc(conversation.ref);
      }
    },
    () => deleteDoc(doc(database, 'users', uid)),
  ];

  const failures = [];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      failures.push(error);
    }
  }
  return failures;
}
