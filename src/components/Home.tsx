import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function Home() {
    const [roomName, setRoomName] = useState('');
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorOpen, setErrorOpen] = useState(false);
    const navigate = useNavigate();
    const { signIn, updateDisplayName, user } = useAuth();

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomName.trim() || !userName.trim()) return;

        setLoading(true);
        try {
            // Create user if not signed in
            if (!user) {
                await signIn(userName);
            } else {
                updateDisplayName(userName);
            }

            // We'll create a new room document in Firestore
            // (This will fail if Firebase isn't correctly configured by the user yet,
            // but the logic is correct for the MVP)
            const roomRef = await addDoc(collection(db, 'rooms'), {
                name: roomName,
                revealed: false,
                createdAt: serverTimestamp(),
            });

            navigate(`/room/${roomRef.id}`);
        } catch (error) {
            console.error("Error creating room:", error);
            // For MVP, if Firebase fails (because config is fake), we just mock a navigation
            setErrorOpen(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                        Scrum Poker for agile development teams
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Have fun while estimating with your remote team. Simple, fast, and free.
                    </p>
                </div>

                <Card className="shadow-lg border-0 ring-1 ring-slate-200 dark:ring-slate-800 dark:bg-zinc-900">
                    <CardHeader>
                        <CardTitle>Start New Game</CardTitle>
                        <CardDescription>Choose a name for your game sessions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateRoom} className="space-y-4">
                            <div className="space-y-2 text-left">
                                <label htmlFor="roomName" className="text-sm font-medium text-slate-700 dark:text-slate-300">Game's name</label>
                                <Input
                                    id="roomName"
                                    placeholder="E.g. Sprint Planning"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    className="w-full text-lg py-6"
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2 text-left">
                                <label htmlFor="userName" className="text-sm font-medium text-slate-700 dark:text-slate-300">Your name</label>
                                <Input
                                    id="userName"
                                    placeholder="E.g. John Doe"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full text-lg py-6"
                                    disabled={loading}
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full text-lg py-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                disabled={!roomName.trim() || !userName.trim() || loading}
                            >
                                {loading ? 'Creating...' : 'Start new game'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Firebase Not Configured</DialogTitle>
                        <DialogDescription>
                            It looks like Firebase hasn't been configured yet. We will navigate to a mock room for UI preview purposes.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => {
                            setErrorOpen(false);
                            navigate(`/room/mock-room-id-123`);
                        }}>Continue to Mock Room</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
