package com.quiz;

import com.quiz.model.LeaderboardResult;
import com.quiz.model.QuizEvent;
import com.quiz.service.QuizService;
import com.quiz.service.SpectatorBroadcastService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

class QuizServiceTest {

    @Test
    void shouldDeduplicateAndAggregateCorrectly() {
        ExchangeFunction exchangeFunction = request -> Mono.just(
                ClientResponse.create(org.springframework.http.HttpStatus.OK).build()
        );
        WebClient mockClient = WebClient.builder().exchangeFunction(exchangeFunction).build();
        SpectatorBroadcastService spectatorBroadcastService = new SpectatorBroadcastService(Mockito.mock(SimpMessagingTemplate.class));
        QuizService service = new QuizService(mockClient, spectatorBroadcastService);

        Map<Integer, List<QuizEvent>> data = Map.of(
                0, List.of(
                        new QuizEvent("r1", "Alice", 10),
                        new QuizEvent("r2", "Bob", 7),
                        new QuizEvent("r1", "Alice", 10)
                ),
                1, List.of(
                        new QuizEvent("r3", "Alice", 5),
                        new QuizEvent("r4", "Charlie", 9)
                ),
                2, List.of(new QuizEvent("r2", "Bob", 7))
        );

        LeaderboardResult result = service.pollAndAggregate("REG123", null, data);

        Assertions.assertEquals(31, result.grandTotal());
        Assertions.assertEquals(4, result.uniqueEventsProcessed());
        Assertions.assertEquals(2, result.duplicatesRemoved());
        Assertions.assertEquals("Alice", result.leaderboard().get(0).participant());
        Assertions.assertEquals(15, result.leaderboard().get(0).totalScore());
        Assertions.assertEquals("Charlie", result.leaderboard().get(1).participant());
        Assertions.assertEquals("Bob", result.leaderboard().get(2).participant());
    }

    @Test
    void shouldSortAlphabeticallyOnTie() {
        WebClient mockClient = WebClient.builder().exchangeFunction(request ->
                Mono.just(ClientResponse.create(org.springframework.http.HttpStatus.OK).build())).build();
        SpectatorBroadcastService spectatorBroadcastService = new SpectatorBroadcastService(Mockito.mock(SimpMessagingTemplate.class));
        QuizService service = new QuizService(mockClient, spectatorBroadcastService);

        Map<Integer, List<QuizEvent>> data = Map.of(
                0, List.of(
                        new QuizEvent("r1", "Zane", 10),
                        new QuizEvent("r2", "Anna", 10)
                )
        );

        LeaderboardResult result = service.pollAndAggregate("REG123", null, data);
        Assertions.assertEquals("Anna", result.leaderboard().get(0).participant());
        Assertions.assertEquals("Zane", result.leaderboard().get(1).participant());
    }
}
