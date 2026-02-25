import { create } from 'zustand';
import { TutorialFlowId, TUTORIALS } from '../config/TutorialsConfig';

type TutorialState = {
    activeTutorialId: TutorialFlowId | null;
    currentStepIndex: number;
    isOpen: boolean;

    startTutorial: (id: TutorialFlowId) => void;
    nextStep: () => void;
    skipTutorial: () => void;
    closeTutorial: () => void;
};

export const useTutorialStore = create<TutorialState>((set, get) => ({
    activeTutorialId: null,
    currentStepIndex: 0,
    isOpen: false,

    startTutorial: (id) => {
        set({
            activeTutorialId: id,
            currentStepIndex: 0,
            isOpen: true,
        });
    },

    nextStep: () => {
        const { activeTutorialId, currentStepIndex } = get();
        if (!activeTutorialId) return;

        const tutorialContent = TUTORIALS[activeTutorialId];
        if (currentStepIndex < tutorialContent.length - 1) {
            // Go to next text step
            set({ currentStepIndex: currentStepIndex + 1 });
        } else {
            // End of tutorial
            get().closeTutorial();
        }
    },

    skipTutorial: () => {
        // End tutorial immediately
        get().closeTutorial();
    },

    closeTutorial: () => {
        const { activeTutorialId } = get();

        // We update UserStore if we finished or skipped, so it doesn't show again.
        // To avoid circular dependency loops, we import it inside the function.
        if (activeTutorialId) {
            const { useUserStore } = require('./UserStore');
            const markTutorialComplete = useUserStore.getState().markTutorialComplete;
            markTutorialComplete(activeTutorialId);
        }

        set({ isOpen: false, activeTutorialId: null, currentStepIndex: 0 });
    },
}));
