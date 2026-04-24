package com.quiz.service;

import com.quiz.dto.AuditEvent;
import com.quiz.dto.PollProgressUpdate;
import com.quiz.exception.QuizProcessingException;
import com.quiz.model.LeaderboardEntry;
import com.quiz.model.LeaderboardResult;
import com.quiz.model.PollResponse;
import com.quiz.model.PollTiming;
import com.quiz.model.QuizEvent;
import com.quiz.model.RankChange;
import com.quiz.model.SpectatorUpdate;
import com.quiz.model.SubmitRequest;
import com.quiz.model.SubmitResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Service
public class QuizService {

    private static final Logger log = LoggerFactory.getLogger(QuizService.class);
    private static final int TOTAL_POLLS = 10;
    private static final long POLL_DELAY_MS = 5_000L;
    private static final int MAX_RETRIES = 3;
    private static final java.time.Duration POLL_REQUEST_TIMEOUT = java.time.Duration.ofSeconds(12);

    private final WebClient webClient;
    private final SpectatorBroadcastService spectatorBroadcastService;
    private final AtomicBoolean submitted = new AtomicBoolean(false);
    private volatile LeaderboardResult lastResult;
    private volatile SubmitResponse lastSubmitResponse;

    public QuizService(WebClient quizWebClient, SpectatorBroadcastService spectatorBroadcastService) {
        this.webClient = quizWebClient;
        this.spectatorBroadcastService = spectatorBroadcastService;
    }

    public LeaderboardResult pollAndAggregate(String regNo) {
        return pollAndAggregate("default-job", regNo, null, null, null);
    }

    public LeaderboardResult pollAndAggregate(String regNo, PollListener listener, Map<Integer, List<QuizEvent>> cachedPollData) {
        return pollAndAggregate("default-job", regNo, listener, cachedPollData, null);
    }

    public LeaderboardResult pollAndAggregate(
            String jobId,
            String regNo,
            PollListener listener,
            Map<Integer, List<QuizEvent>> cachedPollData,
            Map<Integer, List<QuizEvent>> capturedPollData) {
        Instant startedAt = Instant.now();
        Map<String, Integer> scoreMap = new HashMap<>();
        Set<String> seen = new HashSet<>();
        Map<Integer, Integer> eventsPerPoll = new LinkedHashMap<>();
        Map<Integer, Integer> duplicatesPerPoll = new LinkedHashMap<>();
        Map<Integer, PollTiming> pollTimings = new LinkedHashMap<>();
        int totalReceived = 0;
        int duplicateCount = 0;
        Instant previousPollCompletedAt = null;
        List<LeaderboardEntry> previousLeaderboard = List.of();

        submitted.set(false);
        MDC.put("regNo", regNo);
        try {
            for (int poll = 0; poll < TOTAL_POLLS; poll++) {
                Instant pollStartedAt = Instant.now();
                emitProgress(listener, poll, "fetching", 0, 0, seen.size(), pollStartedAt, null);
                log.info("poll_start poll={} timestamp={} mode={}", poll, pollStartedAt, cachedPollData == null ? "live" : "replay");

                List<QuizEvent> events = cachedPollData != null
                        ? cachedPollData.getOrDefault(poll, List.of())
                        : fetchPollWithRetry(regNo, poll);
                if (capturedPollData != null) {
                    capturedPollData.put(poll, new ArrayList<>(events));
                }

                int pollDuplicates = 0;
                eventsPerPoll.put(poll, events.size());
                totalReceived += events.size();

                for (QuizEvent event : events) {
                    String key = event.dedupKey();
                    if (!seen.add(key)) {
                        pollDuplicates++;
                        duplicateCount++;
                        emitAudit(listener, poll, event, true, "roundId + participant collision");
                        emitProgress(listener, poll, "duplicate_skipped", events.size(), pollDuplicates, seen.size(), Instant.now(), null);
                        continue;
                    }
                    scoreMap.merge(event.participant(), event.score(), Integer::sum);
                    emitAudit(listener, poll, event, false, "accepted");
                }

                duplicatesPerPoll.put(poll, pollDuplicates);
                Instant pollCompletedAt = Instant.now();
                Long deltaFromPreviousPollMs = previousPollCompletedAt == null
                        ? null
                        : java.time.Duration.between(previousPollCompletedAt, pollCompletedAt).toMillis();
                pollTimings.put(poll, new PollTiming(poll, pollStartedAt, pollCompletedAt, deltaFromPreviousPollMs));
                emitProgress(listener, poll, "done", events.size(), pollDuplicates, seen.size(), pollCompletedAt, deltaFromPreviousPollMs);
                log.info("poll_done poll={} timestamp={} events={} unique={} duplicates={} deltaFromPreviousPollMs={}",
                        poll, pollCompletedAt, events.size(), seen.size(), pollDuplicates, deltaFromPreviousPollMs);
                previousPollCompletedAt = pollCompletedAt;

                List<LeaderboardEntry> partialLeaderboard = rankLeaderboard(scoreMap);
                List<RankChange> rankChanges = computeRankChanges(previousLeaderboard, partialLeaderboard);
                previousLeaderboard = partialLeaderboard;
                SpectatorUpdate update = new SpectatorUpdate(
                        poll + 1,
                        TOTAL_POLLS,
                        partialLeaderboard,
                        events.size(),
                        pollDuplicates,
                        partialLeaderboard.size(),
                        rankChanges,
                        spectatorBroadcastService.getConnectedCount(),
                        (poll == TOTAL_POLLS - 1) ? "completed" : "running",
                        System.currentTimeMillis()
                );
                spectatorBroadcastService.broadcastPollUpdate(jobId, update);

                if (poll < TOTAL_POLLS - 1 && cachedPollData == null) {
                    sleepDelay();
                }
            }
        } finally {
            MDC.clear();
        }

        List<LeaderboardEntry> ranked = rankLeaderboard(scoreMap);

        int grandTotal = ranked.stream().mapToInt(LeaderboardEntry::totalScore).sum();
        LeaderboardResult result = new LeaderboardResult(
                regNo,
                ranked,
                grandTotal,
                totalReceived,
                duplicateCount,
                seen.size(),
                eventsPerPoll,
                duplicatesPerPoll,
                pollTimings,
                startedAt,
                Instant.now()
        );
        lastResult = result;
        log.info("poll_cycle_complete totalPolls={} unique={} grandTotal={} duplicates={} totalReceived={}",
                TOTAL_POLLS, seen.size(), grandTotal, duplicateCount, totalReceived);
        return result;
    }

    private List<LeaderboardEntry> rankLeaderboard(Map<String, Integer> scoreMap) {
        List<LeaderboardEntry> sorted = scoreMap.entrySet().stream()
                .sorted(Comparator.<Map.Entry<String, Integer>>comparingInt(Map.Entry::getValue).reversed()
                        .thenComparing(Map.Entry::getKey))
                .map(entry -> new LeaderboardEntry(0, entry.getKey(), entry.getValue()))
                .toList();

        List<LeaderboardEntry> ranked = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            LeaderboardEntry entry = sorted.get(i);
            ranked.add(new LeaderboardEntry(i + 1, entry.participant(), entry.totalScore()));
        }
        return ranked;
    }

    private List<RankChange> computeRankChanges(List<LeaderboardEntry> previous, List<LeaderboardEntry> current) {
        Map<String, Integer> previousRanks = previous.stream()
                .collect(Collectors.toMap(LeaderboardEntry::participant, LeaderboardEntry::rank));
        List<RankChange> changes = new ArrayList<>();
        for (LeaderboardEntry currentEntry : current) {
            Integer previousRank = previousRanks.get(currentEntry.participant());
            if (previousRank == null || previousRank == currentEntry.rank()) {
                continue;
            }
            int delta = previousRank - currentEntry.rank();
            changes.add(new RankChange(currentEntry.participant(), previousRank, currentEntry.rank(), delta));
        }
        return changes;
    }

    public SubmitResponse submitLeaderboard(LeaderboardResult result) {
        if (!submitted.compareAndSet(false, true)) {
            SubmitResponse idempotent = new SubmitResponse(
                    true,
                    true,
                    result.grandTotal(),
                    result.grandTotal(),
                    "Submission already performed for current run"
            );
            lastSubmitResponse = idempotent;
            return idempotent;
        }

        SubmitRequest request = new SubmitRequest(result.leaderboard(), result.grandTotal());
        SubmitResponse response = webClient.post()
                .uri("/quiz/submit")
                .bodyValue(request)
                .retrieve()
                .onStatus(HttpStatusCode::isError, clientResponse ->
                        clientResponse.bodyToMono(String.class)
                                .defaultIfEmpty("unknown")
                                .flatMap(msg -> Mono.error(new QuizProcessingException("Submit failed: " + msg))))
                .bodyToMono(SubmitResponse.class)
                .retryWhen(reactor.util.retry.Retry.backoff(MAX_RETRIES, java.time.Duration.ofMillis(500)))
                .blockOptional()
                .orElse(new SubmitResponse(false, false, result.grandTotal(), result.grandTotal(), "Empty submit response"));

        lastSubmitResponse = response;
        return response;
    }

    public LeaderboardResult getLastResult() {
        return lastResult;
    }

    public SubmitResponse getLastSubmitResponse() {
        return lastSubmitResponse;
    }

    private List<QuizEvent> fetchPollWithRetry(String regNo, int poll) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder.path("/quiz/messages")
                        .queryParam("regNo", regNo)
                        .queryParam("poll", poll)
                        .build())
                .retrieve()
                .onStatus(HttpStatusCode::isError, response ->
                        response.bodyToMono(String.class)
                                .defaultIfEmpty("unknown")
                                .flatMap(msg -> Mono.error(new QuizProcessingException(
                                        "Poll fetch failed for poll " + poll + ": " + msg))))
                .bodyToMono(PollResponse.class)
                .timeout(POLL_REQUEST_TIMEOUT)
                .retryWhen(reactor.util.retry.Retry.backoff(MAX_RETRIES, java.time.Duration.ofMillis(500)))
                .map(PollResponse::events)
                .defaultIfEmpty(List.of())
                .onErrorMap(ex -> new QuizProcessingException("Unable to fetch poll " + poll, ex))
                .blockOptional()
                .orElse(List.of());
    }

    private void sleepDelay() {
        try {
            Thread.sleep(POLL_DELAY_MS);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new QuizProcessingException("Polling delay interrupted", ex);
        }
    }

    private void emitProgress(
            PollListener listener,
            int poll,
            String status,
            int eventsFound,
            int duplicatesSkipped,
            int totalUnique,
            Instant emittedAt,
            Long deltaFromPreviousPollMs) {
        if (listener != null) {
            listener.onProgress(new PollProgressUpdate(
                    poll,
                    status,
                    eventsFound,
                    duplicatesSkipped,
                    totalUnique,
                    emittedAt,
                    deltaFromPreviousPollMs));
        }
    }

    private void emitAudit(PollListener listener, int poll, QuizEvent event, boolean duplicate, String reason) {
        if (listener != null) {
            listener.onAudit(new AuditEvent(poll, event.roundId(), event.participant(), event.score(), duplicate, reason));
        }
    }
}
