package com.quiz.storage;

import com.quiz.model.QuizEvent;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ReplayCacheSnapshot(
        String regNo,
        Instant cachedAt,
        Map<Integer, List<QuizEvent>> polls
) {
}
