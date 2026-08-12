import {
  type MouseEventHandler,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import {
  STATUS,
  useJoyride,
  type EventData,
  type Status,
  type Step,
  type TooltipRenderProps,
} from 'react-joyride';

import { OnboardingContext } from '@/app/onboarding-context';
import { useProjects } from '@/app/project-context';
import { projectRoutes } from '@/app/route-paths';
import { Button } from '@/components/ui/button';

export const ONBOARDING_STORAGE_KEY = 'forcetrack:onboarding:v1';

function hasCompletedOnboarding(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'complete';
  } catch {
    return false;
  }
}

function rememberOnboardingCompletion(): void {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'complete');
  } catch {
    // The tour remains usable when browser privacy settings disable persistence.
  }
}

function OnboardingTooltip({
  backProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const { t } = useTranslation();
  const backClick = backProps.onClick as MouseEventHandler<HTMLButtonElement>;
  const primaryClick =
    primaryProps.onClick as MouseEventHandler<HTMLButtonElement>;
  const skipClick = skipProps.onClick as MouseEventHandler<HTMLButtonElement>;

  return (
    <section {...tooltipProps} className="onboarding-tooltip">
      <div className="onboarding-progress">
        <span>
          {t('onboarding.progress', { current: index + 1, total: size })}
        </span>
        <div aria-hidden="true">
          {Array.from({ length: size }, (_, stepIndex) => (
            <i
              key={stepIndex}
              className={stepIndex === index ? 'is-current' : undefined}
            />
          ))}
        </div>
      </div>
      {step.title ? <h2>{step.title}</h2> : null}
      <div className="onboarding-copy">{step.content}</div>
      <footer className="onboarding-actions">
        <Button
          variant="unstyled"
          className="onboarding-skip"
          aria-label={skipProps['aria-label']}
          data-action={skipProps['data-action']}
          title={skipProps.title}
          onClick={skipClick}
        >
          {t('onboarding.skip')}
        </Button>
        <div>
          {index > 0 ? (
            <Button
              variant="outline"
              size="dialog"
              aria-label={backProps['aria-label']}
              data-action={backProps['data-action']}
              title={backProps.title}
              onClick={backClick}
            >
              {t('onboarding.back')}
            </Button>
          ) : null}
          <Button
            size="dialog"
            aria-label={primaryProps['aria-label']}
            data-action={primaryProps['data-action']}
            title={primaryProps.title}
            onClick={primaryClick}
          >
            {t(isLastStep ? 'onboarding.finish' : 'onboarding.next')}
          </Button>
        </div>
      </footer>
    </section>
  );
}

function OnboardingTour({
  projectId,
  onEnd,
}: {
  projectId: string | null;
  onEnd(): void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const revealRoute = useCallback(
    (path: string) => async () => {
      navigate(path);
      // Two frames let React commit the new route before Joyride resolves its target.
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => resolve()),
        );
      });
    },
    [navigate],
  );
  const steps = useMemo<Step[]>(() => {
    const projectSteps: Step[] = projectId
      ? [
          {
            target: '[data-onboarding="project-switcher"]',
            placement: 'bottom-start',
            title: t('onboarding.project.title'),
            content: t('onboarding.project.description'),
          },
          {
            target: '[data-onboarding="nav-summary"]',
            placement: 'bottom',
            title: t('onboarding.tabs.summary.title'),
            content: t('onboarding.tabs.summary.description'),
            before: revealRoute(projectRoutes.summary(projectId)),
          },
          {
            target: '[data-onboarding="page-summary"]',
            placement: 'bottom-start',
            title: t('onboarding.tabs.summaryWorkspace.title'),
            content: t('onboarding.tabs.summaryWorkspace.description'),
            before: revealRoute(projectRoutes.summary(projectId)),
          },
          {
            target: '[data-onboarding="nav-backlog"]',
            placement: 'bottom',
            title: t('onboarding.tabs.backlog.title'),
            content: t('onboarding.tabs.backlog.description'),
            before: revealRoute(projectRoutes.backlog(projectId)),
          },
          {
            target: '[data-onboarding="page-backlog"]',
            placement: 'bottom-start',
            title: t('onboarding.tabs.backlogWorkspace.title'),
            content: t('onboarding.tabs.backlogWorkspace.description'),
            before: revealRoute(projectRoutes.backlog(projectId)),
          },
          {
            target: '[data-onboarding="nav-board"]',
            placement: 'bottom',
            title: t('onboarding.tabs.board.title'),
            content: t('onboarding.tabs.board.description'),
            before: revealRoute(projectRoutes.board(projectId)),
          },
          {
            target: '[data-onboarding="page-board"]',
            placement: 'bottom-start',
            title: t('onboarding.tabs.boardWorkspace.title'),
            content: t('onboarding.tabs.boardWorkspace.description'),
            before: revealRoute(projectRoutes.board(projectId)),
          },
          {
            target: '[data-onboarding="nav-timeline"]',
            placement: 'bottom',
            title: t('onboarding.tabs.timeline.title'),
            content: t('onboarding.tabs.timeline.description'),
            before: revealRoute(projectRoutes.timeline(projectId)),
          },
          {
            target: '[data-onboarding="page-timeline"]',
            placement: 'bottom-start',
            title: t('onboarding.tabs.timelineWorkspace.title'),
            content: t('onboarding.tabs.timelineWorkspace.description'),
            before: revealRoute(projectRoutes.timeline(projectId)),
          },
        ]
      : [
          {
            target: '[data-onboarding="project-switcher"]',
            placement: 'bottom-start',
            title: t('onboarding.project.title'),
            content: t('onboarding.project.emptyDescription'),
          },
          {
            target: '[data-onboarding="empty-workspace"]',
            placement: 'top',
            title: t('onboarding.emptyWorkspace.title'),
            content: t('onboarding.emptyWorkspace.description'),
          },
        ];

    return [
      {
        target: 'body',
        placement: 'center',
        title: t('onboarding.welcome.title'),
        content: t('onboarding.welcome.description'),
      },
      ...projectSteps,
      {
        target: '[data-onboarding="help-entry"]',
        placement: 'bottom-end',
        title: t('onboarding.help.title'),
        content: t('onboarding.help.description'),
      },
    ];
  }, [projectId, revealRoute, t]);
  const handleEvent = useCallback(
    ({ status }: EventData) => {
      if (([STATUS.FINISHED, STATUS.SKIPPED] as Status[]).includes(status)) {
        onEnd();
      }
    },
    [onEnd],
  );
  const { Tour } = useJoyride({
    continuous: true,
    locale: {
      back: t('onboarding.back'),
      last: t('onboarding.finish'),
      next: t('onboarding.next'),
      nextWithProgress: t('onboarding.next'),
      skip: t('onboarding.skip'),
    },
    run: true,
    scrollToFirstStep: true,
    steps,
    tooltipComponent: OnboardingTooltip,
    onEvent: handleEvent,
    options: {
      blockTargetInteraction: true,
      buttons: ['back', 'primary', 'skip'],
      dismissKeyAction: false,
      overlayClickAction: false,
      overlayColor: 'rgba(9, 10, 12, 0.74)',
      scrollOffset: 24,
      skipScroll: true,
      showProgress: true,
      skipBeacon: true,
      spotlightPadding: 8,
      spotlightRadius: 12,
      targetWaitTimeout: 2500,
      width: 400,
      zIndex: 80,
    },
    styles: {
      arrow: { color: 'var(--surface-raised)' },
      tooltip: { padding: 0 },
    },
  });

  return Tour;
}

/** Starts once per browser profile and keeps replay available for returning users. */
export function OnboardingProvider({ children }: PropsWithChildren) {
  const { currentProject, isReady } = useProjects();
  const location = useLocation();
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const hasCheckedFirstVisit = useRef(false);
  const returnPath = useRef<string | null>(null);

  const startOnboarding = useCallback(() => {
    returnPath.current = location.pathname;
    setIsRunning(true);
  }, [location.pathname]);
  const finishOnboarding = useCallback(() => {
    rememberOnboardingCompletion();
    setIsRunning(false);
    if (returnPath.current) {
      navigate(returnPath.current, { replace: true });
      returnPath.current = null;
    }
  }, [navigate]);

  useEffect(() => {
    if (!isReady || hasCheckedFirstVisit.current) return;
    hasCheckedFirstVisit.current = true;
    if (hasCompletedOnboarding()) return;
    const frame = window.requestAnimationFrame(startOnboarding);
    return () => window.cancelAnimationFrame(frame);
  }, [isReady, startOnboarding]);

  useEffect(() => {
    if (!isRunning) return;
    const root = document.documentElement;
    const body = document.body;
    root.classList.add('onboarding-active');
    body.classList.add('onboarding-active');
    return () => {
      root.classList.remove('onboarding-active');
      body.classList.remove('onboarding-active');
    };
  }, [isRunning]);

  const value = useMemo(() => ({ startOnboarding }), [startOnboarding]);

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {isRunning ? (
        <OnboardingTour
          projectId={currentProject?.id ?? null}
          onEnd={finishOnboarding}
        />
      ) : null}
    </OnboardingContext.Provider>
  );
}
