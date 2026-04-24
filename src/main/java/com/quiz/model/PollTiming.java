package com.quiz.model;

import java.time.Instant;

public record PollTiming(
        int poll,
        Instant startedAt,
        Instant completedAt,
        Long deltaFromPreviousPollMs
) {
}
