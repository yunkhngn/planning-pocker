import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, updateDoc, setDoc, query, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Input } from './ui/input';
import { Share, User as UserIcon, Timer, LogOut } from 'lucide-react';
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const FIBONACCI_CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];
const STALE_USER_THRESHOLD_MS = 45_000;

type RoomData = {
    name: string;
    revealed: boolean;
    timerEndsAt: number | null;
};

type RoomUser = {
    id: string;
    name: string;
    vote: string | null;
    lastSeenMs: number | null;
};

const INITIAL_ROOM: RoomData = {
    name: 'Loading...',
    revealed: false,
    timerEndsAt: null,
};

function toMillis(value: unknown): number | null {
    if (typeof value === 'number') {
        return value;
    }

    if (value && typeof value === 'object' && 'toMillis' in value) {
        const maybeTimestamp = value as { toMillis?: () => number };
        if (typeof maybeTimestamp.toMillis === 'function') {
            return maybeTimestamp.toMillis();
        }
    }

    return null;
}

function getFallbackSeatStyle(index: number, totalUsers: number) {
    const fallbackIndex = Math.max(index - 4, 0);
    const fallbackCount = Math.max(totalUsers - 4, 1);
    const angle = (fallbackIndex / fallbackCount) * Math.PI * 2;
    const x = Math.cos(angle) * 250;
    const y = Math.sin(angle) * 110;

    return {
        left: `calc(50% + ${Math.round(x)}px)`,
        top: `calc(50% + ${Math.round(y)}px)`,
        transform: 'translate(-50%, -50%)',
    };
}

export function Room() {
    const { id: roomId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, displayName, updateDisplayName, signIn } = useAuth();

    const [room, setRoom] = useState<RoomData>(INITIAL_ROOM);
    const [users, setUsers] = useState<RoomUser[]>([]);
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [temporaryName, setTemporaryName] = useState('');
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isJoining, setIsJoining] = useState(false);

    const myVote = useMemo(
        () => users.find((u) => u.id === user?.uid)?.vote ?? null,
        [users, user?.uid],
    );

    // Check display name and auth state
    useEffect(() => {
        if (!user || !displayName) {
            setShowNameDialog(true);
        }
    }, [user, displayName]);

    const toggleReveal = useCallback(async () => {
        if (!roomId) return;
        try {
            const roomRef = doc(db, 'rooms', roomId);
            await updateDoc(roomRef, { revealed: !room.revealed });
        } catch {
            setRoom((prev) => ({ ...prev, revealed: !prev.revealed }));
        }
    }, [roomId, room.revealed]);

    // Firestore Subscriptions
    useEffect(() => {
        if (!roomId || !user) return;

        // Subscribe to Room details (Mock wrapper logic to avoid crash if no Firebase)
        try {
            const roomRef = doc(db, 'rooms', roomId);
            const unsubRoom = onSnapshot(roomRef, (snapshot) => {
                if (snapshot.exists()) {
                    const roomData = snapshot.data() as Partial<{
                        name: string;
                        revealed: boolean;
                        timerEndsAt: unknown;
                    }>;
                    setRoom({
                        name: roomData.name ?? 'Untitled Room',
                        revealed: Boolean(roomData.revealed),
                        timerEndsAt: toMillis(roomData.timerEndsAt),
                    });
                }
            });

            // Subscribe to Users in Room
            const usersRef = collection(db, 'rooms', roomId, 'users');
            const unsubUsers = onSnapshot(query(usersRef), (snapshot) => {
                const now = Date.now();
                const usersList: RoomUser[] = snapshot.docs
                    .map((d) => {
                        const data = d.data() as Partial<{
                            name: string;
                            vote: string | null;
                            lastSeen: unknown;
                        }>;
                        return {
                            id: d.id,
                            name: data.name ?? 'Anonymous',
                            vote: data.vote ?? null,
                            lastSeenMs: toMillis(data.lastSeen),
                        };
                    })
                    .filter((u) => u.lastSeenMs === null || now - u.lastSeenMs < STALE_USER_THRESHOLD_MS);
                setUsers(usersList);
            });

            return () => {
                unsubRoom();
                unsubUsers();
            };
        } catch {
            console.warn("Firestore not configured yet. Using mock data.");
            setRoom({ name: 'Mock Room (Firestore missing)', revealed: false, timerEndsAt: null });
            setUsers([
                { id: '1', name: 'Alice', vote: '5', lastSeenMs: Date.now() },
                { id: '2', name: 'Bob', vote: null, lastSeenMs: Date.now() },
            ]);
        }
    }, [roomId, user]);

    // Presence heartbeat + best-effort leave for browser/tab close.
    useEffect(() => {
        if (!user || !displayName || !roomId) return;

        const userDocRef = doc(db, 'rooms', roomId, 'users', user.uid);

        const upsertPresence = async () => {
            try {
                await setDoc(
                    userDocRef,
                    {
                        name: displayName,
                        vote: null,
                        lastSeen: serverTimestamp(),
                    },
                    { merge: true },
                );
            } catch {
                console.warn("Could not join room via Firestore (mocking).");
            }
        };

        const leaveRoomBestEffort = () => {
            void deleteDoc(userDocRef).catch(() => { });
        };

        void upsertPresence();

        const heartbeatId = window.setInterval(() => {
            void updateDoc(userDocRef, { lastSeen: serverTimestamp() }).catch(() => { });
        }, 15_000);

        window.addEventListener('beforeunload', leaveRoomBestEffort);
        window.addEventListener('pagehide', leaveRoomBestEffort);

        return () => {
            window.clearInterval(heartbeatId);
            window.removeEventListener('beforeunload', leaveRoomBestEffort);
            window.removeEventListener('pagehide', leaveRoomBestEffort);
            leaveRoomBestEffort();
        };
    }, [user, displayName, roomId]);

    // Timer Effect
    useEffect(() => {
        if (!room?.timerEndsAt || room.revealed) {
            setTimeLeft(null);
            return;
        }

        const timerEndsAt = room.timerEndsAt;

        const intervalId = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
            setTimeLeft(remaining);

            if (remaining === 0) {
                clearInterval(intervalId);
                if (!room.revealed) {
                    toggleReveal();
                }
            }
        }, 1000);

        // Initial tick
        setTimeLeft(Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000)));

        return () => clearInterval(intervalId);
    }, [room?.timerEndsAt, room?.revealed, toggleReveal]);

    const handleSaveName = async () => {
        if (!temporaryName.trim() || isJoining) return;
        setIsJoining(true);
        try {
            if (!user) {
                await signIn(temporaryName);
            } else {
                updateDisplayName(temporaryName);
            }
            setShowNameDialog(false);
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeaveRoom = async () => {
        if (user && roomId) {
            try {
                const userDocRef = doc(db, 'rooms', roomId, 'users', user.uid);
                await deleteDoc(userDocRef);
            } catch (error) {
                console.error("Error leaving room", error);
            }
        }
        navigate('/');
    };

    const handleVote = async (value: string) => {
        if (!user || !roomId) return;
        try {
            const userDocRef = doc(db, 'rooms', roomId, 'users', user.uid);
            await updateDoc(userDocRef, { vote: value });
        } catch {
            console.warn("Vote mocked:", value);
            // Mocking local state
            setUsers(prev => prev.map(u => u.id === user?.uid || u.name === 'Alice' ? { ...u, vote: value } : u));
        }
    };

    const startTimer = async (seconds: number) => {
        if (!roomId) return;
        try {
            const roomRef = doc(db, 'rooms', roomId);
            const timerObj = seconds > 0
                ? { timerEndsAt: Date.now() + seconds * 1000, revealed: false }
                : { timerEndsAt: null }; // Cancel timer logic
            await updateDoc(roomRef, timerObj);
        } catch {
            console.warn("Timer mocked");
            setRoom((prev) => ({
                ...prev,
                timerEndsAt: seconds > 0 ? Date.now() + seconds * 1000 : null,
                revealed: false
            }));
        }
    };

    const resetVotes = async () => {
        if (!roomId) return;
        try {
            const roomRef = doc(db, 'rooms', roomId);
            await updateDoc(roomRef, { revealed: false, timerEndsAt: null });
            // Reset each user's vote
            for (const u of users) {
                const userDoc = doc(db, 'rooms', roomId, 'users', u.id);
                await updateDoc(userDoc, { vote: null });
            }
        } catch {
            setRoom((prev) => ({ ...prev, revealed: false, timerEndsAt: null }));
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
                        <Button onClick={handleSaveName} disabled={isJoining} className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg disabled:opacity-70">
                            {isJoining ? 'Joining...' : 'Continue'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Top Bar for Room Name and Invite */}
            <div className="h-16 border-b dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-6 shadow-sm transition-colors duration-300">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{room.name}</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={copyInviteLink} className="gap-2 font-medium text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/40 dark:text-blue-400">
                        <Share size={16} />
                        Invite players
                    </Button>
                    <Button variant="ghost" onClick={handleLeaveRoom} className="gap-2 font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 px-3">
                        <LogOut size={16} />
                        <span className="hidden sm:inline">Leave Room</span>
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col pt-12">
                {/* Poker Table Area */}
                <div className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col items-center relative min-h-[400px]">

                    {/* Oval Table */}
                    <div className="w-[600px] max-w-full h-64 bg-slate-200/60 dark:bg-slate-800/60 rounded-[100px] border-8 border-slate-300 dark:border-slate-700 shadow-inner flex flex-col items-center justify-center relative mt-20 mb-12 transition-colors duration-300">
                        <div className="space-y-4 flex flex-col items-center z-10">
                            {room.revealed ? (
                                <Button onClick={resetVotes} className="bg-blue-600 hover:bg-blue-700 font-semibold px-8 py-6 rounded-full shadow-lg">
                                    Start new voting
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button onClick={toggleReveal} className="bg-blue-600 hover:bg-blue-700 font-semibold px-8 py-6 rounded-full shadow-lg">
                                        Reveal cards
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="px-4 py-6 rounded-full shadow-lg bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700">
                                                <Timer size={20} className={timeLeft !== null && timeLeft > 0 ? "text-blue-500 animate-pulse" : "text-gray-500"} />
                                                {timeLeft !== null && timeLeft > 0 && (
                                                    <span className="ml-2 font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{timeLeft}s</span>
                                                )}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="center">
                                            <DropdownMenuItem onClick={() => startTimer(10)}>10 Seconds</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => startTimer(20)}>20 Seconds</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => startTimer(30)}>30 Seconds</DropdownMenuItem>
                                            {room?.timerEndsAt && (
                                                <DropdownMenuItem onClick={() => startTimer(0)} className="text-red-500 focus:text-red-600">Cancel Timer</DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                        </div>

                        {/* Avatars dynamically placed around table (Top, Bottom, Left, Right approximations) */}
                        {users.map((u, i) => {
                            // Determine position based on index to mimic sitting around the table
                            // Normally this requires math or flex grids; we simulate with absolute positioning
                            // 0: top, 1: bottom, 2: left, 3: right, etc.
                            let positionClasses = "";
                            let positionStyle: CSSProperties | undefined;
                            if (i === 0) positionClasses = "-top-16 left-1/2 -translate-x-1/2";
                            else if (i === 1) positionClasses = "-bottom-16 left-1/2 -translate-x-1/2";
                            else if (i === 2) positionClasses = "-left-20 top-1/2 -translate-y-1/2";
                            else if (i === 3) positionClasses = "-right-20 top-1/2 -translate-y-1/2";
                            else positionStyle = getFallbackSeatStyle(i, users.length);

                            const isMe = user?.uid === u.id;

                            return (
                                <div key={u.id} className={`absolute flex flex-col items-center gap-2 ${positionClasses}`} style={positionStyle}>
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
