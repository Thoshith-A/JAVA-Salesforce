package com.quiz.storage;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.quiz.exception.QuizProcessingException;
import com.quiz.model.QuizEvent;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class ReplayCacheStore {

    private static final Path CACHE_PATH = Path.of("data", "replay-cache.json");
    private final ObjectMapper objectMapper;

    public ReplayCacheStore() {
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    public synchronized void save(String regNo, Map<Integer, List<QuizEvent>> pollData) {
        try {
            Files.createDirectories(CACHE_PATH.getParent());
            ReplayCacheSnapshot snapshot = new ReplayCacheSnapshot(regNo, java.time.Instant.now(), pollData);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(CACHE_PATH.toFile(), snapshot);
        } catch (IOException ex) {
            throw new QuizProcessingException("Failed to persist replay cache", ex);
        }
    }

    public synchronized Optional<ReplayCacheSnapshot> load() {
        if (!Files.exists(CACHE_PATH)) {
            return Optional.empty();
        }
        try {
            ReplayCacheSnapshot snapshot = objectMapper.readValue(CACHE_PATH.toFile(), ReplayCacheSnapshot.class);
            return Optional.ofNullable(snapshot);
        } catch (IOException ex) {
            throw new QuizProcessingException("Failed to load replay cache", ex);
        }
    }
}
