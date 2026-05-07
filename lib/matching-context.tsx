import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MatchSession, MatchingStatus, ChannelMessage, TimeProposal, RetreatChoice, RetreatState } from './matching-types';
import { sampleChannelMessages } from './matching-mock-data';

interface MatchingState {
  session: MatchSession | null;
  isMatching: boolean; // 是否正在广播匹配
  myBroadcastMessage: string;
}

type MatchingAction =
  | { type: 'START_BROADCAST'; message: string }
  | { type: 'CANCEL_BROADCAST' }
  | { type: 'ACCEPT_MATCH'; opponentId: string; opponentNickname: string; opponentAvatar: string; opponentRankTier: string }
  | { type: 'BOTH_CONFIRMED' }
  | { type: 'ENTER_CHANNEL' }
  | { type: 'SEND_MESSAGE'; message: ChannelMessage }
  | { type: 'START_SCHEDULING' }
  | { type: 'PROPOSE_TIME'; proposal: TimeProposal }
  | { type: 'RESPOND_TIME'; proposalId: string; accepted: boolean }
  | { type: 'TRIGGER_RETREAT' }
  | { type: 'SET_MY_RETREAT_CHOICE'; choice: RetreatChoice }
  | { type: 'SET_OPPONENT_RETREAT_CHOICE'; choice: RetreatChoice }
  | { type: 'COMPLETE_SESSION' }
  | { type: 'CANCEL_SESSION' }
  | { type: 'RESET' };

const initialState: MatchingState = {
  session: null,
  isMatching: false,
  myBroadcastMessage: '',
};

function matchingReducer(state: MatchingState, action: MatchingAction): MatchingState {
  switch (action.type) {
    case 'START_BROADCAST':
      return { ...state, isMatching: true, myBroadcastMessage: action.message };

    case 'CANCEL_BROADCAST':
      return { ...state, isMatching: false, myBroadcastMessage: '' };

    case 'ACCEPT_MATCH':
      return {
        ...state,
        isMatching: false,
        session: {
          id: `session_${Date.now()}`,
          myId: 'user_001',
          opponentId: action.opponentId,
          opponentNickname: action.opponentNickname,
          opponentAvatar: action.opponentAvatar,
          opponentRankTier: action.opponentRankTier,
          status: 'confirming',
          messages: [],
          timeProposals: [],
          createdAt: new Date().toISOString(),
        },
      };

    case 'BOTH_CONFIRMED':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          status: 'in_channel',
          messages: [...sampleChannelMessages],
        },
      };

    case 'ENTER_CHANNEL':
      if (!state.session) return state;
      return {
        ...state,
        session: { ...state.session, status: 'in_channel' },
      };

    case 'SEND_MESSAGE':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          messages: [...state.session.messages, action.message],
        },
      };

    case 'START_SCHEDULING':
      if (!state.session) return state;
      return {
        ...state,
        session: { ...state.session, status: 'scheduling' },
      };

    case 'PROPOSE_TIME':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          status: 'negotiating',
          timeProposals: [...state.session.timeProposals, action.proposal],
        },
      };

    case 'RESPOND_TIME':
      if (!state.session) return state;
      const updatedProposals = state.session.timeProposals.map(p =>
        p.id === action.proposalId ? { ...p, status: action.accepted ? 'accepted' as const : 'rejected' as const } : p
      );
      const rejectedCount = updatedProposals.filter(p => p.status === 'rejected').length;
      const accepted = updatedProposals.some(p => p.status === 'accepted');
      let newStatus: MatchingStatus = state.session.status;
      if (accepted) {
        newStatus = 'completed';
      } else if (rejectedCount >= 2) {
        newStatus = 'retreat';
      }
      return {
        ...state,
        session: {
          ...state.session,
          status: newStatus,
          timeProposals: updatedProposals,
          retreatState: newStatus === 'retreat' ? {
            triggered: true,
            deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          } : state.session.retreatState,
        },
      };

    case 'TRIGGER_RETREAT':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          status: 'retreat',
          retreatState: {
            triggered: true,
            deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          },
        },
      };

    case 'SET_MY_RETREAT_CHOICE':
      if (!state.session?.retreatState) return state;
      const myRetreat: RetreatState = {
        ...state.session.retreatState,
        myChoice: action.choice,
      };
      // 检查双方是否都选择了
      let retreatStatus: MatchingStatus = 'retreat';
      if (myRetreat.myChoice && myRetreat.opponentChoice) {
        if (myRetreat.myChoice === 'continue_negotiate' && myRetreat.opponentChoice === 'continue_negotiate') {
          retreatStatus = 'negotiating'; // 双方都选择继续协商
        } else if (myRetreat.myChoice === 'force_exit' && myRetreat.opponentChoice === 'force_exit') {
          retreatStatus = 'cancelled'; // 双方都选择退出
        }
        // 一方继续一方退出 => 保持retreat状态等待改选
      }
      return {
        ...state,
        session: {
          ...state.session,
          status: retreatStatus,
          retreatState: myRetreat,
        },
      };

    case 'SET_OPPONENT_RETREAT_CHOICE':
      if (!state.session?.retreatState) return state;
      const oppRetreat: RetreatState = {
        ...state.session.retreatState,
        opponentChoice: action.choice,
      };
      let oppRetreatStatus: MatchingStatus = 'retreat';
      if (oppRetreat.myChoice && oppRetreat.opponentChoice) {
        if (oppRetreat.myChoice === 'continue_negotiate' && oppRetreat.opponentChoice === 'continue_negotiate') {
          oppRetreatStatus = 'negotiating';
        } else if (oppRetreat.myChoice === 'force_exit' && oppRetreat.opponentChoice === 'force_exit') {
          oppRetreatStatus = 'cancelled';
        }
      }
      return {
        ...state,
        session: {
          ...state.session,
          status: oppRetreatStatus,
          retreatState: oppRetreat,
        },
      };

    case 'COMPLETE_SESSION':
      if (!state.session) return state;
      return {
        ...state,
        session: { ...state.session, status: 'completed' },
      };

    case 'CANCEL_SESSION':
      if (!state.session) return state;
      return {
        ...state,
        session: { ...state.session, status: 'cancelled' },
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface MatchingContextType {
  state: MatchingState;
  dispatch: React.Dispatch<MatchingAction>;
}

const MatchingContext = createContext<MatchingContextType | undefined>(undefined);

export function MatchingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(matchingReducer, initialState);
  return (
    <MatchingContext.Provider value={{ state, dispatch }}>
      {children}
    </MatchingContext.Provider>
  );
}

export function useMatching() {
  const context = useContext(MatchingContext);
  if (!context) {
    throw new Error('useMatching must be used within a MatchingProvider');
  }
  return context;
}
