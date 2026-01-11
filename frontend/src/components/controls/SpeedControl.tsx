import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSimulationSpeed } from "@/api/simulation";
import { Slider } from "@/components/ui/Slider";
import { WS_URL } from "@/lib/constants";

export function SpeedControl() {
  const queryClient = useQueryClient();

  const { data: speed } = useQuery({
    queryKey: ["speed"],
    queryFn: fetchSimulationSpeed,
    initialData: 1.0,
  });

  const mutation = useMutation({
    mutationFn: async (newSpeed: number) => {
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        ws.send(JSON.stringify({ speed: newSpeed }));
        ws.close();
      };
    },
    onMutate: async (newSpeed) => {
      await queryClient.cancelQueries({ queryKey: ["speed"] });
      const prev = queryClient.getQueryData(["speed"]);
      queryClient.setQueryData(["speed"], newSpeed);
      return { prev };
    },
    onError: (_err, _newSpeed, context) => {
      queryClient.setQueryData(["speed"], context?.prev);
    },
  });

  return (
    <div className="flex items-center gap-4">
      <label className="font-mono text-fg whitespace-nowrap">
        Speed: {speed?.toFixed(1)}x
      </label>
      <Slider
        min={0.1}
        max={10.0}
        step={0.1}
        value={speed}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          mutation.mutate(parseFloat(e.target.value))
        }
      />
    </div>
  );
}
