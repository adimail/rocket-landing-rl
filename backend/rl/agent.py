import numpy as np


class QLearningAgent:
    def __init__(
        self,
        state_space_size,
        action_space_size,
        learning_rate=0.1,
        discount_factor=0.9,
        exploration_rate=1.0,
        min_exploration_rate=0.01,
        exploration_decay_rate=0.001,
    ):
        self.state_space_size = state_space_size
        self.action_space_size = action_space_size
        self.learning_rate = learning_rate
        self.discount_factor = discount_factor
        self.exploration_rate = exploration_rate
        self.min_exploration_rate = min_exploration_rate
        self.exploration_decay_rate = exploration_decay_rate
        self.q_table = np.zeros((state_space_size, action_space_size))

    def choose_action(self, state):
        """
        Chooses an action based on the current state using epsilon-greedy policy.
        """
        if np.random.rand() < self.exploration_rate:
            action = np.random.randint(self.action_space_size)
        else:
            action = np.argmax(self.q_table[state, :])
        return action

    def update_q_table(self, state, action, reward, next_state, done):
        """
        Updates the Q-value for a given state-action pair using the Q-learning update rule.
        """
        if done:
            target_q_value = reward
        else:
            target_q_value = reward + self.discount_factor * np.max(
                self.q_table[next_state, :]
            )

        self.q_table[state, action] = self.q_table[
            state, action
        ] + self.learning_rate * (target_q_value - self.q_table[state, action])

    def decay_exploration_rate(self, episode):
        """
        Decays the exploration rate over episodes.
        """
        self.exploration_rate = max(
            self.min_exploration_rate, np.exp(-self.exploration_decay_rate * episode)
        )

    def get_q_table(self):
        return self.q_table
