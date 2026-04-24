package com.quiz.model;

import java.util.List;

public record SubmitRequest(
        List<LeaderboardEntry> leaderboard,
        int totalScore
) {
}
