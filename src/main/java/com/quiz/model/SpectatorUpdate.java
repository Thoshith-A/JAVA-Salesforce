package com.quiz.model;

import java.util.List;

public record SpectatorUpdate(
        int pollNumber,
        int totalPolls,
        List<LeaderboardEntry> leaderboard,
        int newEventsThisPoll,
        int duplicatesThisPoll,
        int totalUniqueParticipants,
        List<RankChange> rankChanges,
        int connectedSpectators,
        String jobStatus,
        long timestamp
) {
}
