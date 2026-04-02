import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/vibez/ui/button";
import { Card } from "@/components/vibez/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/vibez/ui/avatar";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface PendingRequestApi {
  user_id: string;
  name?: string;
  avatar_url?: string | null;
  user_name?: string;
  user_avatar?: string;
}

interface PendingRequest {
  user_id: string;
  user_name: string;
  user_avatar?: string;
}

interface HostControlsPanelProps {
  roomId: string;
  isHost: boolean;
}

const HostControlsPanel = ({ roomId, isHost }: HostControlsPanelProps) => {
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!isHost) {
      setPendingRequests([]);
      return;
    }

    if (!roomId || typeof roomId !== "string" || roomId.trim() === "") {
      return;
    }

    const normalizedRoomId = roomId.trim();

    const fetchPendingRequests = async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        console.log("Fetching pending requests", {
          roomId: normalizedRoomId,
          isHost,
        });

        const { data, error } = await supabase.functions.invoke("manage-room", {
          body: {
            action: "get_pending_requests",
            room_id: normalizedRoomId,
          },
        });

        if (error) {
          console.error("Failed to fetch pending requests:", error);
          return;
        }

        const requests: PendingRequestApi[] = data?.pending_requests || [];

        const mappedRequests: PendingRequest[] = requests.map((req) => ({
          user_id: req.user_id,
          user_name: req.user_name || req.name || "Unknown",
          user_avatar: req.user_avatar || req.avatar_url || undefined,
        }));

        setPendingRequests(mappedRequests);
      } catch (error: any) {
        console.error("Failed to fetch pending requests:", error);
      } finally {
        inFlightRef.current = false;
      }
    };

    fetchPendingRequests();

    pollingRef.current = window.setInterval(fetchPendingRequests, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      inFlightRef.current = false;
    };
  }, [roomId, isHost]);

  const handleApprove = async (userId: string) => {
    if (!roomId || !isHost) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("manage-room", {
        body: {
          action: "approve",
          room_id: roomId,
          user_id: userId,
        },
      });

      if (error) throw error;

      toast.success("User approved!");
      setPendingRequests((prev) =>
        prev.filter((req) => req.user_id !== userId),
      );
    } catch (error: any) {
      console.error("Failed to approve user:", error);
      toast.error("Failed to approve user");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (userId: string) => {
    if (!roomId || !isHost) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("manage-room", {
        body: {
          action: "reject",
          room_id: roomId,
          user_id: userId,
        },
      });

      if (error) throw error;

      toast.success("User rejected");
      setPendingRequests((prev) =>
        prev.filter((req) => req.user_id !== userId),
      );
    } catch (error: any) {
      console.error("Failed to reject user:", error);
      toast.error("Failed to reject user");
    } finally {
      setLoading(false);
    }
  };

  if (!isHost || pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-accent/50 border border-accent">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4" />
        <h3 className="font-semibold">
          Join Requests ({pendingRequests.length})
        </h3>
      </div>

      <div className="space-y-2">
        {pendingRequests.map((request) => (
          <div
            key={request.user_id}
            className="flex items-center justify-between p-2 bg-background rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={request.user_avatar} />
                <AvatarFallback>
                  {request.user_name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{request.user_name}</span>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => handleApprove(request.user_id)}
                disabled={loading}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(request.user_id)}
                disabled={loading}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default HostControlsPanel;
