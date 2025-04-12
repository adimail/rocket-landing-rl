I want to build a full reinforcement learning system that learns to land a vertically falling rocket booster safely back on the ground, mimicking the SpaceX Falcon 9 landing. The booster starts in mid-air with an initial altitude, velocity, and orientation, and it must land softly, upright, and centered on a target zone.

The system must simulate realistic physics (gravity, thrust, rotation, momentum), allow my model to control the booster through throttle and gimbal actions, and provide a reward signal that encourages safe and efficient landings. I want to visualize the simulation live as the model learns and interactively observe how the rocket behaves during training. I also want to be able to inspect the training process, pause it, resume it, and understand what the model is learning over time.

```
make start
```
