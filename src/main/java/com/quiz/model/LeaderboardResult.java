package com.quiz.model;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record LeaderboardResult(
        String regNo,
        List<LeaderboardEntry> leaderboard,
        int grandTotal,
        int totalEventsReceived,
        int duplicatesRemoved,
        int uniqueEventsProcessed,
        Map<Integer, Integer> eventsPerPoll,
        Map<Integer, Integer> duplicatesPerPoll,
        Map<Integer, PollTiming> pollTimings,
        Instant startedAt,
        Instant completedAt
) {
    public long durationMillis() {
        return Duration.between(startedAt, completedAt).toMillis();
    }
}
