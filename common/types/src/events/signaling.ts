export interface SignalingEvent {
    type: 'offer' | 'answer' | 'candidate';
    senderId: string;
    recipientId: string;
    data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface SignalingResponse {
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
}