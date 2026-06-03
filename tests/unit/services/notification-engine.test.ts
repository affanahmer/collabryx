/**
 * Notification Engine Service Tests
 *
 * Tests for lib/services/notification-engine.ts
 * Covers: sendNotification, sendBulkNotifications, generateDigest,
 *         cleanupExpiredNotifications, checkNotificationPreferences
 *
 * All external dependencies mocked — deterministic tests only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendNotification,
  sendBulkNotifications,
  generateDigest,
  cleanupExpiredNotifications,
  checkNotificationPreferences,
  type NotificationInput,
} from "@/lib/services/notification-engine";
import { mockSupabaseClient } from "@/tests/setup/mocks";

// ─── Mock Infrastructure ───────────────────────────────────────────────────

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    app: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

// Mock @supabase/supabase-js createClient to return our mockSupabaseClient
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockSupabaseClient,
}));

// ─── Test Constants ────────────────────────────────────────────────────────

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440001";
const VALID_UUID_2 = "550e8400-e29b-41d4-a716-446655440002";
const VALID_UUID_3 = "550e8400-e29b-41d4-a716-446655440003";

const validInput: NotificationInput = {
  userId: VALID_UUID,
  type: "match",
  content: "You have a new match!",
};

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("Notification Engine Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set required env vars for getServiceClient
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXNlcnZpY2UifQ.test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";

    // Re-initialize all chainable methods on mockSupabaseClient after clear
    mockSupabaseClient.from = vi.fn().mockReturnThis();
    mockSupabaseClient.select = vi.fn().mockReturnThis();
    mockSupabaseClient.insert = vi.fn().mockReturnThis();
    mockSupabaseClient.update = vi.fn().mockReturnThis();
    mockSupabaseClient.delete = vi.fn().mockReturnThis();
    mockSupabaseClient.eq = vi.fn().mockReturnThis();
    mockSupabaseClient.order = vi.fn().mockReturnThis();
    mockSupabaseClient.limit = vi.fn().mockReturnThis();
    mockSupabaseClient.range = vi.fn().mockReturnThis();
    mockSupabaseClient.gte = vi.fn().mockReturnThis();
    mockSupabaseClient.lte = vi.fn().mockReturnThis();
    mockSupabaseClient.lt = vi.fn().mockReturnThis();
    mockSupabaseClient.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.then = vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null }));
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  // ── sendNotification() ───────────────────────────────────────────────────

  describe("sendNotification", () => {
    it("sends notification successfully", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: "notif-1" },
        error: null,
      });

      // Act
      const result = await sendNotification(validInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.notificationId).toBe("notif-1");
      expect(result.error).toBeUndefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("notifications");
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: VALID_UUID,
          type: "match",
          content: "You have a new match!",
        }),
      );
    });

    it("validates input with Zod and rejects invalid input", async () => {
      // Arrange
      const invalidInput = {
        userId: "not-a-uuid",
        type: "match",
        content: "test",
      } as unknown as NotificationInput;

      // Act
      const result = await sendNotification(invalidInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it("rejects input with empty content", async () => {
      // Arrange
      const invalidInput: NotificationInput = {
        userId: VALID_UUID,
        type: "match",
        content: "",
      };

      // Act
      const result = await sendNotification(invalidInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("rejects input with invalid notification type", async () => {
      // Arrange
      const invalidInput = {
        userId: VALID_UUID,
        type: "invalid_type",
        content: "test",
      } as unknown as NotificationInput;

      // Act
      const result = await sendNotification(invalidInput);

      // Assert
      expect(result.success).toBe(false);
    });

    it("respects notification_preferences and skips when disabled", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: { ai_smart_match_alerts: false },
        error: null,
      });

      // Act
      const result = await sendNotification(validInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBe("Notification disabled by user preferences");
      // Should NOT reach the insert call (only from() called once for preferences)
      const fromCalls = mockSupabaseClient.from.mock.calls;
      expect(fromCalls.length).toBe(1);
      expect(fromCalls[0][0]).toBe("notification_preferences");
    });

    it("handles missing preferences record and defaults to allow", async () => {
      // Arrange — PGRST116 = no rows found
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });
      // Second call (insert) success
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: "notif-2" },
        error: null,
      });

      // Act
      const result = await sendNotification(validInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.notificationId).toBe("notif-2");
    });

    it("handles Supabase insert errors", async () => {
      // Arrange
      // First call: preferences check — allow
      mockSupabaseClient.single.mockResolvedValue({
        data: { ai_smart_match_alerts: true },
        error: null,
      });
      // Second call: insert fails
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "Duplicate key violation" },
      });

      // Act
      const result = await sendNotification(validInput);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Duplicate key violation");
    });

    it("handles missing recipient by checking preferences gracefully", async () => {
      // Arrange — preferences check returns error but not PGRST116
      // The service defaults to allow (true) on any preference error
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: "500", message: "Internal server error" },
      });
      // Insert succeeds
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: "notif-4" },
        error: null,
      });

      // Act
      const result = await sendNotification(validInput);

      // Assert — preference error defaults to allow, then insert succeeds
      expect(result.success).toBe(true);
      expect(result.notificationId).toBe("notif-4");
    });

    it("accepts optional fields (actorId, actorName, actorAvatar, resourceType, resourceId)", async () => {
      // Arrange
      const inputWithOptionals: NotificationInput = {
        userId: VALID_UUID,
        type: "like",
        content: "Someone liked your post",
        actorId: VALID_UUID_2,
        actorName: "Jane Doe",
        actorAvatar: "https://example.com/avatar.jpg",
        resourceType: "post",
        resourceId: VALID_UUID_3,
      };
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: "notif-3" },
        error: null,
      });

      // Act
      const result = await sendNotification(inputWithOptionals);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          actor_id: VALID_UUID_2,
          actor_name: "Jane Doe",
          actor_avatar: "https://example.com/avatar.jpg",
          resource_type: "post",
          resource_id: VALID_UUID_3,
        }),
      );
    });
  });

  // ── sendBulkNotifications() ──────────────────────────────────────────────

  describe("sendBulkNotifications", () => {
    it("sends multiple notifications successfully", async () => {
      // Arrange
      const inputs: NotificationInput[] = [
        { userId: VALID_UUID, type: "match", content: "Match 1" },
        { userId: VALID_UUID_2, type: "match", content: "Match 2" },
        { userId: VALID_UUID_3, type: "like", content: "Like 1" },
      ];
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: "notif-bulk-1" },
        error: null,
      });

      // Act
      const result = await sendBulkNotifications(inputs);

      // Assert
      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("isolates errors so one failure doesn't stop the batch", async () => {
      // Arrange
      const inputs: NotificationInput[] = [
        { userId: VALID_UUID, type: "match", content: "Success" },
        { userId: "not-a-uuid", type: "match", content: "Invalid" },
        { userId: VALID_UUID_2, type: "like", content: "Success" },
      ];
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: "notif-ok" },
        error: null,
      });

      // Act
      const result = await sendBulkNotifications(inputs);

      // Assert
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it("returns correct sent/failed counts with mixed results", async () => {
      // Arrange — need mocks for: pref-check-1, insert-1, pref-check-2, insert-2
      // Input 1: preferences allow + insert succeeds
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ai_smart_match_alerts: true },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: "notif-1" },
        error: null,
      });
      // Input 2: preferences allow + insert fails
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ai_smart_match_alerts: true },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: "500", message: "DB error" },
      });

      const inputs: NotificationInput[] = [
        { userId: VALID_UUID, type: "match", content: "A" },
        { userId: VALID_UUID_2, type: "match", content: "B" },
      ];

      // Act
      const result = await sendBulkNotifications(inputs);

      // Assert
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain("DB error");
    });

    it("handles empty input array", async () => {
      // Arrange & Act
      const result = await sendBulkNotifications([]);

      // Assert
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });
  });

  // ── generateDigest() ─────────────────────────────────────────────────────

  describe("generateDigest", () => {
    it("generates digest for users with unread notifications", async () => {
      // Arrange
      const today = new Date().toISOString().split("T")[0];
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({
            data: [
              {
                id: "n1",
                user_id: VALID_UUID,
                type: "match",
                content: "Match",
                created_at: `${today}T10:00:00Z`,
              },
              {
                id: "n2",
                user_id: VALID_UUID,
                type: "like",
                content: "Like",
                created_at: `${today}T11:00:00Z`,
              },
            ],
            error: null,
          }),
      );
      mockSupabaseClient.insert.mockResolvedValue({ data: null, error: null });

      // Act
      const result = await generateDigest();

      // Assert
      expect(result.digestsQueued).toBe(1); // 1 user grouped
      expect(result.digestsSent).toBe(1);
      expect(result.digestsFailed).toBe(0);
      expect(result.errors).toEqual([]);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("notifications");
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("is_read", false);
    });

    it("respects dryRun mode (counts only, no inserts)", async () => {
      // Arrange
      const today = new Date().toISOString().split("T")[0];
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({
            data: [
              {
                id: "n1",
                user_id: VALID_UUID,
                type: "match",
                content: "Match",
                created_at: `${today}T10:00:00Z`,
              },
            ],
            error: null,
          }),
      );

      // Act
      const result = await generateDigest({ dryRun: true });

      // Assert
      expect(result.digestsQueued).toBe(1);
      expect(result.digestsSent).toBe(0);
      expect(result.digestsFailed).toBe(0);
      // insert should NOT be called in dryRun mode
      expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
    });

    it("respects batchSize parameter", async () => {
      // Arrange
      const today = new Date().toISOString().split("T")[0];
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({
            data: [
              {
                id: "n1",
                user_id: VALID_UUID,
                type: "match",
                content: "Match",
                created_at: `${today}T10:00:00Z`,
              },
            ],
            error: null,
          }),
      );
      mockSupabaseClient.insert.mockResolvedValue({ data: null, error: null });

      // Act
      await generateDigest({ batchSize: 50 });

      // Assert
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(50);
    });

    it("handles date filtering", async () => {
      // Arrange
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null }),
      );

      // Act
      await generateDigest({ date: "2025-01-15" });

      // Assert
      expect(mockSupabaseClient.gte).toHaveBeenCalledWith(
        "created_at",
        "2025-01-15T00:00:00Z",
      );
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith(
        "created_at",
        "2025-01-15T23:59:59Z",
      );
    });

    it("handles no unread notifications", async () => {
      // Arrange
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null }),
      );

      // Act
      const result = await generateDigest();

      // Assert
      expect(result.digestsQueued).toBe(0);
      expect(result.digestsSent).toBe(0);
      expect(result.digestsFailed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("handles Supabase query errors", async () => {
      // Arrange
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({ data: null, error: { code: "500", message: "Query failed" } }),
      );

      // Act
      const result = await generateDigest();

      // Assert
      expect(result.digestsQueued).toBe(0);
      expect(result.digestsSent).toBe(0);
      expect(result.digestsFailed).toBe(1);
      expect(result.errors).toContain("Query failed");
    });

    it("tracks digest insert failures per user", async () => {
      // Arrange
      const today = new Date().toISOString().split("T")[0];
      let thenCallCount = 0;
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) => {
          thenCallCount++;
          if (thenCallCount === 1) {
            // Initial query for unread notifications
            resolve({
              data: [
                {
                  id: "n1",
                  user_id: VALID_UUID,
                  type: "match",
                  content: "Match",
                  created_at: `${today}T10:00:00Z`,
                },
                {
                  id: "n2",
                  user_id: VALID_UUID_2,
                  type: "like",
                  content: "Like",
                  created_at: `${today}T11:00:00Z`,
                },
              ],
              error: null,
            });
          } else if (thenCallCount === 2) {
            // First user digest insert — succeeds
            resolve({ data: null, error: null });
          } else {
            // Second user digest insert — fails
            resolve({ data: null, error: { code: "500", message: "Insert failed" } });
          }
        },
      );

      // Act
      const result = await generateDigest();

      // Assert
      expect(result.digestsQueued).toBe(2);
      expect(result.digestsSent).toBe(1);
      expect(result.digestsFailed).toBe(1);
      expect(result.errors.length).toBe(1);
    });
  });

  // ── cleanupExpiredNotifications() ────────────────────────────────────────

  describe("cleanupExpiredNotifications", () => {
    it("deletes notifications older than cutoff", async () => {
      // Arrange — then() is used for both count query and delete
      let cleanupThenCall = 0;
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) => {
          cleanupThenCall++;
          if (cleanupThenCall === 1) {
            // Count query
            resolve({ count: 10, error: null });
          } else if (cleanupThenCall === 2) {
            // Fetch IDs batch - return rows with IDs
            resolve({ data: Array.from({ length: 10 }, (_, i) => ({ id: `id-${i}` })), error: null });
          } else {
            // Delete operation
            resolve({ data: null, error: null });
          }
        },
      );
      mockSupabaseClient.delete.mockReturnThis();
      mockSupabaseClient.in.mockReturnThis();

      // Act
      const result = await cleanupExpiredNotifications({ olderThanDays: 30 });

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("notifications");
      expect(mockSupabaseClient.lt).toHaveBeenCalled();
      // Service counts actual deleted rows (batchIds.length), not batch size
      expect(result.notificationsDeleted).toBe(10);
      expect(result.notificationsArchived).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("respects dryRun mode (counts only, no deletes)", async () => {
      // Arrange
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({ count: 50, error: null }),
      );

      // Act
      const result = await cleanupExpiredNotifications({ dryRun: true });

      // Assert
      expect(result.notificationsDeleted).toBe(0);
      expect(result.notificationsArchived).toBe(50);
      expect(result.errors).toEqual([]);
      // delete() should NOT be called in dryRun
      expect(mockSupabaseClient.delete).not.toHaveBeenCalled();
    });

    it("respects batchSize parameter", async () => {
      // Arrange
      let batchThenCall = 0;
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) => {
          batchThenCall++;
          if (batchThenCall === 1) {
            resolve({ count: 1500, error: null });
          } else {
            resolve({ data: null, error: null });
          }
        },
      );
      mockSupabaseClient.delete.mockReturnThis();

      // Act
      await cleanupExpiredNotifications({ batchSize: 500 });

      // Assert
      expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 499);
    });

    it("respects userId filter", async () => {
      // Arrange
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({ count: 5, error: null }),
      );
      mockSupabaseClient.delete.mockReturnThis();
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({ data: null, error: null }),
      );

      // Act
      await cleanupExpiredNotifications({ userId: VALID_UUID });

      // Assert
      // eq should be called with user_id filter
      const eqCalls = mockSupabaseClient.eq.mock.calls;
      const userIdFilterApplied = eqCalls.some(
        (call: unknown[]) =>
          Array.isArray(call) &&
          call.length >= 2 &&
          call[0] === "user_id" &&
          call[1] === VALID_UUID,
      );
      expect(userIdFilterApplied).toBe(true);
    });

    it("handles no expired notifications", async () => {
      // Arrange
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({ count: 0, error: null }),
      );

      // Act
      const result = await cleanupExpiredNotifications();

      // Assert
      expect(result.notificationsDeleted).toBe(0);
      expect(result.notificationsArchived).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("handles Supabase count errors", async () => {
      // Arrange
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({ count: null, error: { code: "500", message: "Count query failed" } }),
      );

      // Act
      const result = await cleanupExpiredNotifications();

      // Assert
      expect(result.notificationsDeleted).toBe(0);
      expect(result.notificationsArchived).toBe(0);
      expect(result.errors).toContain("Count query failed");
    });

    it("handles Supabase delete errors in batch processing", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        count: 100,
        error: null,
      });
      mockSupabaseClient.delete.mockReturnThis();
      // Override then to return error for delete operations
      mockSupabaseClient.then.mockImplementation(
        (resolve: (value: unknown) => void) =>
          resolve({ data: null, error: { code: "500", message: "Batch delete failed" } }),
      );

      // Act
      const result = await cleanupExpiredNotifications({ batchSize: 100 });

      // Assert
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── checkNotificationPreferences() ───────────────────────────────────────

  describe("checkNotificationPreferences", () => {
    it("returns true when preferences allow notification", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: { push_match_alerts: true },
        error: null,
      });

      // Act
      const result = await checkNotificationPreferences(VALID_UUID, "match");

      // Assert
      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        "notification_preferences",
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("user_id", VALID_UUID);
    });

    it("returns false when preferences disable notification", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: { push_match_alerts: false },
        error: null,
      });

      // Act
      const result = await checkNotificationPreferences(VALID_UUID, "match");

      // Assert
      expect(result).toBe(false);
    });

    it("returns true when no preferences record exists (default allow)", async () => {
      // Arrange — PGRST116 = no rows found
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      // Act
      const result = await checkNotificationPreferences(VALID_UUID, "match");

      // Assert
      expect(result).toBe(true);
    });

    it("returns true for unknown notification types (default allow)", async () => {
      // Arrange & Act
      const result = await checkNotificationPreferences(
        VALID_UUID,
        "unknown_type",
      );

      // Assert
      expect(result).toBe(true);
      // Should NOT query database for unknown types
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it("returns true when Supabase returns general error (fail-open)", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: "500", message: "Database error" },
      });

      // Act
      const result = await checkNotificationPreferences(VALID_UUID, "match");

      // Assert
      expect(result).toBe(true);
    });

    it("returns true when preference value is null/undefined (default allow)", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: { push_match_alerts: null },
        error: null,
      });

      // Act
      const result = await checkNotificationPreferences(VALID_UUID, "match");

      // Assert
      expect(result).toBe(true);
    });

    it("maps connect type to push_new_connections preference", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: { push_new_connections: false },
        error: null,
      });

      // Act
      const result = await checkNotificationPreferences(VALID_UUID, "connect");

      // Assert
      expect(result).toBe(false);
      expect(mockSupabaseClient.select).toHaveBeenCalledWith(
        "push_new_connections",
      );
    });

    it("maps message type to push_messages preference", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: { push_messages: false },
        error: null,
      });

      // Act
      const result = await checkNotificationPreferences(VALID_UUID, "message");

      // Assert
      expect(result).toBe(false);
      expect(mockSupabaseClient.select).toHaveBeenCalledWith("push_messages");
    });

    it("maps like type to push_post_likes preference", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: { push_post_likes: false },
        error: null,
      });

      // Act
      const result = await checkNotificationPreferences(VALID_UUID, "like");

      // Assert
      expect(result).toBe(false);
      expect(mockSupabaseClient.select).toHaveBeenCalledWith(
        "push_post_likes",
      );
    });

    it("maps comment type to push_comments preference", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: { push_comments: false },
        error: null,
      });

      // Act
      const result = await checkNotificationPreferences(VALID_UUID, "comment");

      // Assert
      expect(result).toBe(false);
      expect(mockSupabaseClient.select).toHaveBeenCalledWith("push_comments");
    });

    it("maps system type to in_app_notifications preference", async () => {
      // Arrange
      mockSupabaseClient.single.mockResolvedValue({
        data: { in_app_notifications: false },
        error: null,
      });

      // Act
      const result = await checkNotificationPreferences(VALID_UUID, "system");

      // Assert
      expect(result).toBe(false);
      expect(mockSupabaseClient.select).toHaveBeenCalledWith(
        "in_app_notifications",
      );
    });
  });
});
