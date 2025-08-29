
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, onSnapshot, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { CurrentUser, OtherUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Phone, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useCall } from '@/context/CallContext';

type CallStatus = 'idle' | 'starting' | 'connecting' | 'connected' | 'ended';

interface VideoCallProps {
    chatId: string;
    currentUser: CurrentUser;
    otherUser: OtherUser;
    onClose: () => void;
    startWithVideo: boolean;
}

export function VideoCall({ chatId, currentUser, otherUser, onClose, startWithVideo }: VideoCallProps) {
    const { activeCall, setActiveCall } = useCall();
    const [callStatus, setCallStatus] = useState<CallStatus>('idle');
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const pc = useRef<RTCPeerConnection | null>(null);
    const answerCandidates = useRef<RTCIceCandidateInit[]>([]).current;
    const offerCandidates = useRef<RTCIceCandidateInit[]>([]).current;
    
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const { toast } = useToast();

    const servers = {
        iceServers: [
            { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
        ],
        iceCandidatePoolSize: 10,
    };
    
    const hangUp = useCallback(async () => {
        if (!activeCall?.id) return;
        const callDocRef = doc(firestore, 'calls', activeCall.id);
        if((await getDoc(callDocRef)).exists()){
            await updateDoc(callDocRef, { status: 'ended' });
        }
        
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        setRemoteStream(null);
        setCallStatus('ended');
        setActiveCall(null);
        onClose();
    }, [activeCall?.id, localStream, onClose, setActiveCall]);


    const startCall = useCallback(async () => {
        setCallStatus('starting');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);

        pc.current = new RTCPeerConnection(servers);
        stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

        pc.current.onicecandidate = async event => {
            if (event.candidate && activeCall?.id) {
                const callDocRef = doc(firestore, 'calls', activeCall.id);
                await addDoc(collection(callDocRef, 'offerCandidates'), event.candidate.toJSON());
            }
        };
        
        pc.current.ontrack = event => {
            setRemoteStream(event.streams[0]);
        };

        const callDocRef = doc(collection(firestore, 'calls'));
        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);

        const offer = { type: offerDescription.type, sdp: offerDescription.sdp };
        
        const callData = {
            id: callDocRef.id,
            chatId,
            caller: { uid: currentUser.uid, fullName: currentUser.displayName, avatarUrl: currentUser.photoURL },
            callee: { uid: otherUser.uid, fullName: otherUser.fullName, avatarUrl: otherUser.avatarUrl },
            status: 'ringing',
            offer,
        };

        await setDoc(callDocRef, callData);
        setActiveCall(callData);
        setCallStatus('connecting');

    }, [currentUser, otherUser, chatId, setActiveCall]);

    // Handle being the callee (answering)
    useEffect(() => {
        const answer = async () => {
            if (!startWithVideo || !activeCall || callStatus !== 'idle') return;

            setCallStatus('connecting');
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            pc.current = new RTCPeerConnection(servers);
            stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));
            
            pc.current.onicecandidate = async event => {
                if (event.candidate && activeCall?.id) {
                    const callDocRef = doc(firestore, 'calls', activeCall.id);
                    await addDoc(collection(callDocRef, 'answerCandidates'), event.candidate.toJSON());
                }
            };
            
            pc.current.ontrack = event => {
                setRemoteStream(event.streams[0]);
            };
            
            const callDocRef = doc(firestore, 'calls', activeCall.id);
            const callDocSnap = await getDoc(callDocRef);
            if (!callDocSnap.exists()) return;

            await pc.current.setRemoteDescription(new RTCSessionDescription(callDocSnap.data().offer));
            
            const answerDescription = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answerDescription);

            const answer = { type: answerDescription.type, sdp: answerDescription.sdp };
            await updateDoc(callDocRef, { answer });

            onSnapshot(collection(callDocRef, 'offerCandidates'), snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        offerCandidates.push(new RTCIceCandidate(change.doc.data()));
                    }
                });
            });
        };
        answer();
    }, [startWithVideo, activeCall, callStatus, offerCandidates]);


    // Listen for call document changes (for both caller and callee)
    useEffect(() => {
        if (!activeCall?.id) return;
        
        const callDocRef = doc(firestore, 'calls', activeCall.id);
        const unsubscribe = onSnapshot(callDocRef, async (snapshot) => {
            const data = snapshot.data();
            
            if (!snapshot.exists() || data?.status === 'ended' || data?.status === 'declined') {
                hangUp();
                return;
            }

            // Caller: when callee answers
            if (data?.answer && pc.current?.signalingState !== 'stable') {
                await pc.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
            }

            // Caller: receives callee's candidates
            if (data?.answer) {
                 onSnapshot(collection(callDocRef, 'answerCandidates'), snapshot => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'added') {
                            answerCandidates.push(new RTCIceCandidate(change.doc.data()));
                        }
                    });
                });
            }
        });
        return () => unsubscribe();
    }, [activeCall?.id, hangUp, answerCandidates]);

    // Process ICE candidates
    useEffect(() => {
        const processCandidates = async () => {
            if (pc.current?.remoteDescription) {
                if(offerCandidates.length > 0) {
                     offerCandidates.forEach(candidate => pc.current?.addIceCandidate(candidate));
                     offerCandidates.length = 0; // Clear queue
                }
                if(answerCandidates.length > 0) {
                    answerCandidates.forEach(candidate => pc.current?.addIceCandidate(candidate));
                    answerCandidates.length = 0; // Clear queue
                }
            }
        };
        const interval = setInterval(processCandidates, 1000);
        return () => clearInterval(interval);
    }, [offerCandidates, answerCandidates]);


    useEffect(() => {
        if (pc.current) {
            pc.current.onconnectionstatechange = () => {
                if (pc.current?.connectionState === 'connected') {
                    setCallStatus('connected');
                }
                 if (pc.current?.connectionState === 'failed' || pc.current?.connectionState === 'disconnected' || pc.current?.connectionState === 'closed') {
                    hangUp();
                }
            };
        }
    }, [hangUp]);


    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);


    const toggleMute = () => {
        if (!localStream) return;
        localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
        setIsMuted(!isMuted);
    };

    const toggleVideo = () => {
        if (!localStream) return;
        localStream.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
        setIsVideoOff(!isVideoOff);
    };

    const renderCallStatus = () => {
        if (callStatus === 'idle' && !startWithVideo) {
            return (
                 <div className="text-center text-white z-10">
                    <h2 className="text-2xl mb-4">Ready to call {otherUser.fullName}?</h2>
                    <Button onClick={startCall} size="lg" className="bg-green-500 hover:bg-green-600">
                         <Phone className="mr-2 h-5 w-5" /> Start Call
                    </Button>
                </div>
            )
        }
        if (!remoteStream && (callStatus === 'connecting')) {
            return (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-800 space-y-4">
                    <Avatar className='h-32 w-32 border-4 border-primary'>
                        <AvatarImage src={otherUser.avatarUrl} />
                        <AvatarFallback>{otherUser.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h2 className='text-2xl font-bold'>{otherUser.fullName}</h2>
                    <p className='text-lg'>
                        {callStatus === 'connecting' && (activeCall?.caller.uid === currentUser.uid ? 'Calling...' : 'Connecting...')}
                    </p>
                </div>
            )
        }
        return null;
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">

            <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
                <video ref={remoteVideoRef} autoPlay playsInline className={cn("h-full w-full object-cover transition-opacity duration-500", remoteStream ? "opacity-100" : "opacity-0")} />
                
                <div className={cn("absolute bottom-4 right-4 h-48 w-36 rounded-lg object-cover border-2 border-primary z-10 transition-opacity duration-500 overflow-hidden", localStream ? "opacity-100" : "opacity-0")}>
                    <video ref={localVideoRef} autoPlay playsInline muted className={cn("h-full w-full object-cover", isVideoOff && "hidden")} />
                    {isVideoOff && <div className='h-full w-full bg-black flex items-center justify-center'><VideoOff className="h-10 w-10 text-white" /></div>}
                </div>
              
                {renderCallStatus()}
            </div>
            
            {(callStatus === 'connected' || callStatus === 'connecting') && (
                <div className="bg-gray-800 bg-opacity-70 p-4 flex justify-center items-center space-x-4">
                    <Button onClick={toggleMute} variant="outline" className="bg-white/10 text-white hover:bg-white/20 rounded-full h-14 w-14 p-0">
                        {isMuted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                    </Button>
                    <Button onClick={toggleVideo} variant="outline" className="bg-white/10 text-white hover:bg-white/20 rounded-full h-14 w-14 p-0">
                        {isVideoOff ? <VideoOff className="h-7 w-7" /> : <Video className="h-7 w-7" />}
                    </Button>
                    <Button onClick={() => hangUp()} className="bg-red-500 hover:bg-red-600 rounded-full h-14 w-14 p-0">
                        <PhoneOff className="h-7 w-7 text-white" />
                    </Button>
                </div>
            )}
        </div>
    );
}
