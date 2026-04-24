package com.quiz.model;

public record QuizEvent(
        String roundId,
        String participant,
        int score
) {
    public String dedupKey() {
        return roundId + ":" + participant;
    }
}
