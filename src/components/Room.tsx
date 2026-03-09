import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, updateDoc, setDoc, query } from 'firebase/firestore';
import { Input } from './ui/input';
import { Share, User as UserIcon } from 'lucide-react';
import { toast } from "sonner";

const FIBONACCI_CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

export function Room() {
    const { id: roomId } = useParams<{ id: string }>();
    const { user, displayName, updateDisplayName, signIn } = useAuth();

    const [room, setRoom] = useState<any>({ name: 'Loading...', revealed: false });
    const [users, setUsers] = useState<any[]>([]);
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [temporaryName, setTemporaryName] = useState('');

    // Check display name and auth state
    useEffect(() => {
        if (!user || !displayName) {
            setShowNameDialog(true);
        }
    }, [user, displayName]);

    // Firestore Subscriptions
    useEffect(() => {
        if (!roomId) return;

        // Subscribe to Room details (Mock wrapper logic to avoid crash if no Firebase)
        try {
            const roomRef = doc(db, 'rooms', roomId);
            const unsubRoom = onSnapshot(roomRef, (snapshot) => {
                if (snapshot.exists()) {
                    setRoom(snapshot.data());
                }
            });

            // Subscribe to Users in Room
            const usersRef = collection(db, 'rooms', roomId, 'users');
            const unsubUsers = onSnapshot(query(usersRef), (snapshot) => {
                const usersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setUsers(usersList);
            });

            return () => {
                unsubRoom();
                unsubUsers();
            };
        } catch (e) {
            console.warn("Firestore not configured yet. Using mock data.");
            setRoom({ name: 'Mock Room (Firestore missing)', revealed: false });
            setUsers([
                { id: '1', name: 'Alice', vote: '5' },
                { id: '2', name: 'Bob', vote: null },
            ]);
        }
    }, [roomId]);

    // Join Room implicitly when user exists and has a name
    useEffect(() => {
        if (user && displayName && roomId) {
            try {
                const userDocRef = doc(db, 'rooms', roomId, 'users', user.uid);
                setDoc(userDocRef, { name: displayName, vote: null }, { merge: true });
            } catch (e) {
                console.warn("Could not join room via Firestore (mocking).");
            }
        }
    }, [user, displayName, roomId]);

    const handleSaveName = async () => {
        if (temporaryName.trim()) {
            if (!user) {
                await signIn(temporaryName);
            } else {
                updateDisplayName(temporaryName);
            }
            setShowNameDialog(false);
        }
    };

    // Remove user from room on close
    useEffect(() => {
        const handleUnload = () => {
            if (user?.uid && roomId) {
                // Best effort to remove user from active room list on tab close
                // The AuthContext already handles deleting the anonymous account.
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [user, roomId]);

    const handleVote = async (value: string) => {
        if (!user || !roomId) return;
        try {
            const userDocRef = doc(db, 'rooms', roomId, 'users', user.uid);
            await updateDoc(userDocRef, { vote: value });
        } catch (e) {
            console.warn("Vote mocked:", value);
            // Mocking local state
            setUsers(prev => prev.map(u => u.id === user?.uid || u.name === 'Alice' ? { ...u, vote: value } : u));
        }
    };

    const toggleReveal = async () => {
        if (!roomId) return;
        try {
            const roomRef = doc(db, 'rooms', roomId);
            await updateDoc(roomRef, { revealed: !room.revealed });
        } catch (e) {
            setRoom((prev: any) => ({ ...prev, revealed: !prev.revealed }));
        }
    };

    const resetVotes = async () => {
        if (!roomId) return;
        try {
            const roomRef = doc(db, 'rooms', roomId);
            await updateDoc(roomRef, { revealed: false });
            // Reset each user's vote
            for (const u of users) {
                const userDoc = doc(db, 'rooms', roomId, 'users', u.id);
                await updateDoc(userDoc, { vote: null });
            }
        } catch (e) {
            setRoom((prev: any) => ({ ...prev, revealed: false }));
            setUsers(prev => prev.map(u => ({ ...u, vote: null })));
        }
    }

    const copyInviteLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Invite link copied to clipboard!');
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-zinc-950 transition-colors duration-300">
            {/* Name Dialog Overlay */}
            {showNameDialog && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-8 max-w-sm w-full space-y-6">
                        <h2 className="text-2xl font-bold text-center dark:text-white">Choose your display name</h2>
                        <Input
                            autoFocus
                            placeholder="Your name"
                            value={temporaryName}
                            onChange={(e) => setTemporaryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            className="py-6 text-lg dark:bg-zinc-800 dark:border-zinc-700"
                        />
                        <Button onClick={handleSaveName} className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg">
                            Continue
                        </Button>
                    </div>
                </div>
            )}

            {/* Top Bar for Room Name and Invite */}
            <div className="h-16 border-b dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-6 shadow-sm transition-colors duration-300">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{room.name}</h2>
                <Button variant="outline" onClick={copyInviteLink} className="gap-2 font-medium text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/40 dark:text-blue-400">
                    <Share size={16} />
                    Invite players
                </Button>
            </div>

            <div className="flex-1 flex flex-col pt-12">
                {/* Poker Table Area */}
                <div className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col items-center relative min-h-[400px]">

                    {/* Oval Table */}
                    <div className="w-[600px] max-w-full h-64 bg-slate-200/60 dark:bg-slate-800/60 rounded-[100px] border-8 border-slate-300 dark:border-slate-700 shadow-inner flex flex-col items-center justify-center relative mt-20 mb-12 transition-colors duration-300">
                        <div className="space-y-4">
                            {room.revealed ? (
                                <Button onClick={resetVotes} className="bg-blue-600 hover:bg-blue-700 font-semibold px-8 py-6 rounded-full shadow-lg">
                                    Start new voting
                                </Button>
                            ) : (
                                <Button onClick={toggleReveal} className="bg-blue-600 hover:bg-blue-700 font-semibold px-8 py-6 rounded-full shadow-lg">
                                    Reveal cards
                                </Button>
                            )}
                        </div>

                        {/* Avatars dynamically placed around table (Top, Bottom, Left, Right approximations) */}
                        {users.map((u, i) => {
                            // Determine position based on index to mimic sitting around the table
                            // Normally this requires math or flex grids; we simulate with absolute positioning
                            // 0: top, 1: bottom, 2: left, 3: right, etc.
                            let positionClasses = "";
                            if (i === 0) positionClasses = "-top-16 left-1/2 -translate-x-1/2";
                            else if (i === 1) positionClasses = "-bottom-16 left-1/2 -translate-x-1/2";
                            else if (i === 2) positionClasses = "-left-20 top-1/2 -translate-y-1/2";
                            else if (i === 3) positionClasses = "-right-20 top-1/2 -translate-y-1/2";
                            else positionClasses = `top-${(i * 10) % 100} right-${(i * 10) % 100}`; // simple fallback

                            const isMe = user?.uid === u.id;

                            return (
                                <div key={u.id} className={`absolute flex flex-col items-center gap-2 ${positionClasses}`}>
                                    {/* The Card */}
                                    {u.vote ? (
                                        <div className={`w-14 h-20 rounded-lg flex items-center justify-center shadow-md border-2 transition-all ${room.revealed ? 'bg-white dark:bg-zinc-800 border-blue-200 dark:border-zinc-600 text-blue-600 dark:text-blue-400' : 'bg-blue-500 dark:bg-blue-700 border-blue-600 dark:border-blue-800'}`}>
                                            {room.revealed ? (
                                                <span className="text-xl font-bold">{u.vote}</span>
                                            ) : (
                                                <span className="text-white text-opacity-80">♠</span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-14 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-zinc-800/50" />
                                    )}

                                    {/* The Player Info */}
                                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-full shadow-sm border dark:border-zinc-800 text-sm font-medium whitespace-nowrap transition-colors duration-300">
                                        <UserIcon size={14} className="text-gray-400 dark:text-gray-500" />
                                        <span className="text-gray-700 dark:text-gray-300 max-w-[100px] truncate">{u.name}{isMe ? ' (You)' : ''}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                </div>

                {/* Voting Cards Section (Bottom Dock) */}
                {!room.revealed && (
                    <div className="w-full bg-white dark:bg-zinc-900 border-t dark:border-zinc-800 p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] pt-8 pb-10 transition-colors duration-300">
                        <div className="max-w-6xl mx-auto flex items-center justify-center flex-wrap gap-2 md:gap-4">
                            <span className="w-full text-center text-gray-500 dark:text-gray-400 font-medium mb-2 uppercase tracking-wide text-xs">Choose your card</span>
                            {FIBONACCI_CARDS.map(cardVal => {
                                const myVote = users.find(u => u.id === user?.uid)?.vote;
                                const isSelected = myVote === cardVal;
                                return (
                                    <button
                                        key={cardVal}
                                        onClick={() => handleVote(cardVal)}
                                        className={`w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 rounded-xl border-2 flex items-center justify-center transition-all duration-200 transform hover:-translate-y-4 hover:shadow-xl ${isSelected
                                            ? 'bg-blue-600 dark:bg-blue-700 text-white border-blue-700 dark:border-blue-600 shadow-blue-500/30 dark:shadow-blue-900/50 shadow-lg -translate-y-4'
                                            : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:border-blue-300 dark:hover:border-blue-500'
                                            }`}
                                    >
                                        <span className="text-xl md:text-3xl font-bold">{cardVal}</span>

                                        {/* Corner tiny texts for poker style */}
                                        <span className={`absolute top-1.5 left-2 text-[10px] md:text-xs font-bold ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>{cardVal}</span>
                                        <span className={`absolute bottom-1.5 right-2 text-[10px] md:text-xs font-bold ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>{cardVal}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
