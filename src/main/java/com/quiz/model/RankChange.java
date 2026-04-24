package com.quiz.model;

public record RankChange(
        String participant,
        int previousRank,
        int currentRank,
        int delta
) {
}
