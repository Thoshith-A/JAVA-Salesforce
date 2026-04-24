package com.quiz.model;

public record LeaderboardEntry(
        int rank,
        String participant,
        int totalScore
) {
}
