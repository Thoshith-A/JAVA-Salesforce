package com.quiz.service;

import com.quiz.dto.AuditEvent;
import com.quiz.dto.PollProgressUpdate;
import com.quiz.exception.QuizProcessingException;
import com.quiz.model.LeaderboardEntry;
import com.quiz.model.LeaderboardResult;
import com.quiz.model.PollTiming;
import com.quiz.model.QuizEvent;
import com.quiz.model.SpectatorEventTrace;
import com.quiz.model.SubmitResponse;
import com.quiz.storage.ReplayCacheSnapshot;
import com.quiz.storage.ReplayCacheStore;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PollOrchestrator {

    private final QuizService quizService;
    private final ReplayCacheStore replayCacheStore;
    private final SpectatorBroadcastService spectatorBroadcastService;
    private final Map<String, Sinks.Many<PollProgressUpdate>> progressStreams = new ConcurrentHashMap<>();
    private final Map<String, List<AuditEvent>> auditLogs = new ConcurrentHashMap<>();
    private final Map<String, LeaderboardResult> results = new ConcurrentHashMap<>();
    private final Map<String, SubmitResponse> submitResponses = new ConcurrentHashMap<>();
    private final Map<Integer, List<QuizEvent>> cachedPollData = new ConcurrentHashMap<>();

    public PollOrchestrator(
            QuizService quizService,
            ReplayCacheStore replayCacheStore,
            SpectatorBroadcastService spectatorBroadcastService) {
        this.quizService = quizService;
        this.replayCacheStore = replayCacheStore;
        this.spectatorBroadcastService = spectatorBroadcastService;
        replayCacheStore.load().ifPresent(snapshot -> {
            cachedPollData.putAll(snapshot.polls());
        });
    }

    public String startRun(String regNo) {
        String jobId = UUID.randomUUID().toString();
        Sinks.Many<PollProgressUpdate> sink = Sinks.many().multicast().onBackpressureBuffer();
        progressStreams.put(jobId, sink);
        auditLogs.put(jobId, new ArrayList<>());

        CompletableFuture.runAsync(() -> {
            try {
                Map<Integer, List<QuizEvent>> fetchedPollData = new ConcurrentHashMap<>();
                LeaderboardResult result = quizService.pollAndAggregate(jobId, regNo, buildListener(jobId), null, fetchedPollData);
                results.put(jobId, result);
                cachedPollData.clear();
                cachedPollData.putAll(fetchedPollData);
                replayCacheStore.save(regNo, fetchedPollData);
                SubmitResponse submitResponse = quizService.submitLeaderboard(result);
                submitResponses.put(jobId, submitResponse);
            } catch (Exception ex) {
                ReplayCacheSnapshot fallbackSnapshot = replayCacheStore.load().orElse(null);
                if (fallbackSnapshot != null && fallbackSnapshot.polls() != null && !fallbackSnapshot.polls().isEmpty()) {
                    LeaderboardResult replayResult = quizService.pollAndAggregate(
                            jobId,
                            regNo,
                            buildListener(jobId),
                            new ConcurrentHashMap<>(fallbackSnapshot.polls()),
                            null
                    );
                    results.put(jobId, replayResult);
                    SubmitResponse submitResponse = quizService.submitLeaderboard(replayResult);
                    submitResponses.put(jobId, new SubmitResponse(
                            submitResponse.isCorrect(),
                            submitResponse.isIdempotent(),
                            submitResponse.submittedTotal(),
                            submitResponse.expectedTotal(),
                            "Live API unavailable, served from cached replay data"
                    ));
                } else {
                    results.put(jobId, buildFailedResult(regNo));
                    submitResponses.put(jobId, new SubmitResponse(
                            false,
                            false,
                            0,
                            0,
                            "Run failed: " + ex.getMessage()
                    ));
                }
            } finally {
                sink.tryEmitComplete();
            }
        });
        return jobId;
    }

    public String startReplay(String regNo) {
        if (cachedPollData.isEmpty()) {
            ReplayCacheSnapshot snapshot = replayCacheStore.load()
                    .orElseThrow(() -> new QuizProcessingException("Replay cache is empty. Run /api/quiz/run first."));
            cachedPollData.putAll(snapshot.polls());
        }
        String jobId = UUID.randomUUID().toString();
        Sinks.Many<PollProgressUpdate> sink = Sinks.many().multicast().onBackpressureBuffer();
        progressStreams.put(jobId, sink);
        auditLogs.put(jobId, new ArrayList<>());

        CompletableFuture.runAsync(() -> {
            try {
                LeaderboardResult result = quizService.pollAndAggregate(jobId, regNo, buildListener(jobId), new ConcurrentHashMap<>(cachedPollData), null);
                results.put(jobId, result);
                SubmitResponse submitResponse = quizService.submitLeaderboard(result);
                submitResponses.put(jobId, submitResponse);
            } catch (Exception ex) {
                results.put(jobId, buildFailedResult(regNo));
                submitResponses.put(jobId, new SubmitResponse(
                        false,
                        false,
                        0,
                        0,
                        "Replay failed: " + ex.getMessage()
                ));
            } finally {
                sink.tryEmitComplete();
            }
        });
        return jobId;
    }

    public Flux<PollProgressUpdate> progressStream(String jobId) {
        Sinks.Many<PollProgressUpdate> sink = progressStreams.get(jobId);
        if (sink == null) {
            return Flux.empty();
        }
        return sink.asFlux();
    }

    public LeaderboardResult getResult(String jobId) {
        return results.get(jobId);
    }

    public SubmitResponse getSubmitResponse(String jobId) {
        return submitResponses.get(jobId);
    }

    public List<AuditEvent> getAuditLog(String jobId) {
        return auditLogs.getOrDefault(jobId, List.of());
    }

    private PollListener buildListener(String jobId) {
        return new PollListener() {
            @Override
            public void onProgress(PollProgressUpdate update) {
                Sinks.Many<PollProgressUpdate> sink = progressStreams.get(jobId);
                if (sink != null) {
                    sink.tryEmitNext(update);
                }
            }

            @Override
            public void onAudit(AuditEvent event) {
                auditLogs.computeIfAbsent(jobId, ignored -> new ArrayList<>()).add(event);
                spectatorBroadcastService.broadcastEventTrace(jobId, new SpectatorEventTrace(
                        event.poll() + 1,
                        event.participant(),
                        event.roundId(),
                        event.score(),
                        event.duplicate(),
                        event.reason(),
                        System.currentTimeMillis()
                ));
            }
        };
    }

    private LeaderboardResult buildFailedResult(String regNo) {
        java.time.Instant now = java.time.Instant.now();
        return new LeaderboardResult(
                regNo,
                List.<LeaderboardEntry>of(),
                0,
                0,
                0,
                0,
                Map.<Integer, Integer>of(),
                Map.<Integer, Integer>of(),
                Map.<Integer, PollTiming>of(),
                now,
                now
        );
    }
}
