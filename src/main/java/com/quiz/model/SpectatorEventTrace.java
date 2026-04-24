package com.quiz.model;

public record SpectatorEventTrace(
        int pollNumber,
        String participant,
        String roundId,
        int score,
        boolean duplicate,
        String reason,
        long timestamp
) {
}
