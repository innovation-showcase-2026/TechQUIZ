import { useMemo, useState, useCallback } from 'react';
import type { Participant, BoothResult, BoothConfig } from '../types';
import { BOOTHS, MAX_BOOTHS_PER_PARTICIPANT, REQUIRED_BOOTHS_TO_WIN, TOTAL_BOOTHS } from '../data/boothsConfig';
import { Button } from '../components/Button';
import { QRScannerModal } from '../components/QRScannerModal';
import { parseBoothFromScan, playErrorSound } from '../utils/qrHelper';
import {
  ScanIcon,
  EditIcon,
  getBoothIcon,
  AlertCircleIcon,
} from '../components/Icons';

interface PassportProps {
  participant: Participant | null;
  boothResults: Record<string, BoothResult>;
  hasReachedBoothLimit: boolean;
  onBackToCurrent?: () => void;
  hasActiveQuiz?: boolean;
  onLaunchBooth?: (booth: BoothConfig) => void;
  onOpenUrl?: (url: string) => void;
  onEditProfile?: () => void;
}

export function Passport({
  participant,
  boothResults,
  hasReachedBoothLimit,
  onBackToCurrent,
  hasActiveQuiz,
  onLaunchBooth,
  onOpenUrl,
  onEditProfile,
}: PassportProps) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanTargetBooth, setScanTargetBooth] = useState<BoothConfig | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const completedList = useMemo(() => Object.values(boothResults), [boothResults]);
  const completedCount = completedList.length;
  const isWinner = completedCount >= REQUIRED_BOOTHS_TO_WIN;
  const remainingToWin = Math.max(0, REQUIRED_BOOTHS_TO_WIN - completedCount);

  // Overall statistics
  const stats = useMemo(() => {
    let totalScore = 0;
    let totalQuestions = 0;
    let totalTime = 0;
    completedList.forEach((r) => {
      totalScore += r.score;
      totalQuestions += r.totalQuestions;
      totalTime += r.timeTakenSeconds;
    });

    const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    const avgTime = completedCount > 0 ? Math.round(totalTime / completedCount) : 0;

    return { totalScore, totalQuestions, accuracy, avgTime, totalTime };
  }, [completedList, completedCount]);

  const progressPercentage = Math.min(100, Math.round((completedCount / REQUIRED_BOOTHS_TO_WIN) * 100));

  const handleOpenScanner = useCallback((target?: BoothConfig | null) => {
    setScanTargetBooth(target || null);
    setIsScannerOpen(true);
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    const { booth, externalUrl } = parseBoothFromScan(decodedText);

    // If user clicked a specific booth button (e.g. Booth 9) but scanned a different booth (e.g. Booth 6)
    if (scanTargetBooth && booth && booth.id !== scanTargetBooth.id) {
      playErrorSound();
      setToastMessage(
        `Wrong Booth! You selected Booth ${scanTargetBooth.number} (${scanTargetBooth.title}), but scanned Booth ${booth.number} (${booth.title}). Please scan the QR code for Booth ${scanTargetBooth.number} to play.`
      );
      setTimeout(() => setToastMessage(null), 6000);
      return;
    }

    setIsScannerOpen(false);

    if (booth) {
      if (onLaunchBooth) {
        onLaunchBooth(booth);
      }
    } else if (externalUrl) {
      if (onOpenUrl) {
        onOpenUrl(externalUrl);
      } else {
        window.location.href = externalUrl;
      }
    } else {
      setToastMessage(
        `Scanned: "${decodedText.length > 40 ? decodedText.slice(0, 40) + '...' : decodedText}". Not recognized as a summit booth challenge.`
      );
      setTimeout(() => setToastMessage(null), 4500);
    }
  }, [scanTargetBooth, onLaunchBooth, onOpenUrl]);

  return (
    <div className="ts-page ts-page--passport">
      <div className="ts-page__container ts-page__container--wide">
        {/* Top Header Card */}
        <div className="ts-passport-header">
          <div className="ts-passport-user-card">
            <div className="ts-passport-avatar" aria-hidden="true">
              {participant?.name ? participant.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="ts-passport-user-info">
              <span className="ts-passport-badge-tag">OFFICIAL SUMMIT PASSPORT</span>
              <h1 className="ts-passport-user-name">
                {participant ? participant.name : 'Summit Attendee'}
              </h1>
              {participant && (
                <span className="ts-passport-user-email">{participant.email || participant.entId}</span>
              )}
            </div>
            {onEditProfile && (
              <button
                type="button"
                className="ts-passport-edit-btn"
                onClick={onEditProfile}
                title="Update registration details"
              >
                <EditIcon size={14} />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Win / Progress Banner */}
        <div className={`ts-qualification-banner ${isWinner ? 'ts-qualification-banner--winner' : 'ts-qualification-banner--progress'}`}>
          <div className="ts-qualification-top-row">
            <h2 className="ts-qualification-title">
              {isWinner ? 'Summit Prize Qualifier & Winner!' : 'Challenge in progress'}
            </h2>
            <span className="ts-qualification-pill">
              {isWinner ? 'Winner' : `${completedCount} of ${REQUIRED_BOOTHS_TO_WIN} to win`}
            </span>
          </div>

          <p className="ts-qualification-desc">
            {isWinner
              ? `Incredible achievement! You have completed ${completedCount} booth quizzes. Present this pass at the Summit helpdesk for your prize!`
              : `Complete ${remainingToWin} more booth ${remainingToWin === 1 ? 'quiz' : 'quizzes'} to unlock official prize qualification.`}
          </p>

          {/* Progress bar toward 4-booth milestone */}
          <div className="ts-passport-progress-bar-wrap">
            <div className="ts-passport-progress-bar">
              <div
                className="ts-passport-progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="ts-passport-progress-labels">
              <span>{completedCount} played</span>
              <span>Goal: {REQUIRED_BOOTHS_TO_WIN} quizzes</span>
              <span>Max: {TOTAL_BOOTHS} booths</span>
            </div>
          </div>
        </div>

        {/* Aggregated Score Summary: 2x2 on mobile, 4 in a row on tablet */}
        <div className="ts-passport-stats-grid">
          <div className="ts-stat-card">
            <span className="ts-stat-card__number">{completedCount}/{TOTAL_BOOTHS}</span>
            <span className="ts-stat-card__label">BOOTHS PLAYED</span>
          </div>
          <div className="ts-stat-card">
            <span className="ts-stat-card__number">{stats.totalScore}/{stats.totalQuestions}</span>
            <span className="ts-stat-card__label">TOTAL SCORE</span>
          </div>
          <div className="ts-stat-card">
            <span className="ts-stat-card__number">{stats.accuracy}%</span>
            <span className="ts-stat-card__label">ACCURACY</span>
          </div>
          <div className="ts-stat-card">
            <span className="ts-stat-card__number">{stats.avgTime}s</span>
            <span className="ts-stat-card__label">AVG TIME / BOOTH</span>
          </div>
        </div>

        {/* 9 Booths Matrix */}
        <div className="ts-booths-matrix-section">
          <div className="ts-matrix-header">
            <div>
              <h2 className="ts-matrix-title">Summit Booth Status</h2>
              <span className="ts-matrix-subtitle">Choose up to {MAX_BOOTHS_PER_PARTICIPANT} of {TOTAL_BOOTHS} booths.</span>
            </div>
            <button
              type="button"
              className="ts-passport-scan-qr-btn"
              onClick={() => handleOpenScanner(null)}
              title="Open camera to scan any booth QR code"
              disabled={hasReachedBoothLimit}
            >
              <ScanIcon size={16} />
              <span>{hasReachedBoothLimit ? 'Limit reached' : 'Scan QR'}</span>
            </button>
          </div>

          {hasReachedBoothLimit && (
            <p className="ts-matrix-subtitle" role="status">
              You have completed the maximum of {MAX_BOOTHS_PER_PARTICIPANT} booth quizzes.
            </p>
          )}

          <div className="ts-booths-grid">
            {BOOTHS.map((booth) => {
              const res = boothResults[booth.id];
              const isCompleted = Boolean(res);

              return (
                <div
                  key={booth.id}
                  className={`ts-booth-card ${isCompleted ? 'ts-booth-card--completed' : 'ts-booth-card--pending'}`}
                >
                  <div className="ts-booth-card__top">
                    <span className="ts-booth-card__number">BOOTH {booth.number}</span>
                    <span className={`ts-booth-card__status-pill ${isCompleted ? 'ts-pill-done' : 'ts-pill-todo'}`}>
                      {isCompleted ? 'Completed' : 'Awaiting visit'}
                    </span>
                  </div>

                  <div className="ts-booth-card__body">
                    <div className="ts-booth-card__icon">{getBoothIcon(booth.number, 22)}</div>
                    <div className="ts-booth-card__details">
                      <h3 className="ts-booth-card__title">{booth.title}</h3>
                      <p className="ts-booth-card__desc">{booth.description}</p>
                    </div>
                  </div>

                  {isCompleted && res ? (
                    <div className="ts-booth-card__result">
                      <div className="ts-booth-card__score">
                        <span>Score {res.score}/{res.totalQuestions} ({res.percentage}%) • {res.timeTakenSeconds}s • {new Date(res.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="ts-booth-card__action">
                      <button
                        type="button"
                        className="ts-booth-scan-btn"
                        onClick={() => handleOpenScanner(booth)}
                        title={`Scan Booth ${booth.number} (${booth.title}) standee QR code to unlock quiz`}
                        disabled={hasReachedBoothLimit}
                      >
                        <ScanIcon size={16} />
                        <span>{hasReachedBoothLimit ? 'Limit reached' : `Scan Booth ${booth.number} QR to play`}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Back / Navigation button */}
        {hasActiveQuiz && onBackToCurrent && (
          <div className="ts-passport-actions">
            <Button onClick={onBackToCurrent} fullWidth>
              RETURN TO CURRENT QUIZ
            </Button>
          </div>
        )}

        {/* Live Camera QR Scanner Modal */}
        <QRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
          targetBooth={scanTargetBooth}
        />

        {/* Toast feedback */}
        {toastMessage && (
          <div className="ts-scanner-toast ts-scanner-toast--error" role="alert">
            <span><AlertCircleIcon size={18} /></span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
