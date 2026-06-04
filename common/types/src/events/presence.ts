export interface PresenceUpdateEvent {
    userId: string;
    online: boolean;
    lastSeenAt?: Date;
}

export interface PresenceHeartbeatEvent {
    userId: string;
    timestamp: Date;
}

export interface UserPresence {
    userId: string;
    online: boolean;
    lastSeenAt: Date;
}