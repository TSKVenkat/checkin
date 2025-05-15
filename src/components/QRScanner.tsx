'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Result } from '@zxing/library';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';

interface QRScannerProps {
  onScanAction: (data: string) => void;
  onError?: (error: Error) => void;
  reactivateDelay?: number;
  className?: string;
  cameraFacingMode?: 'environment' | 'user';
}

export default function QRScanner({
  onScanAction,
  onError,
  reactivateDelay = 1500,
  className = '',
  cameraFacingMode = 'environment', // Rear camera by default
}: QRScannerProps) {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [cameraList, setCameraList] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  const [scanAttempts, setScanAttempts] = useState<number>(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  // Explicitly request camera permissions first
  useEffect(() => {
    let isMounted = true;
    
    const requestCameraPermission = async () => {
      try {
        // First check if permissions API is available
        if (navigator.permissions && navigator.permissions.query) {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          
          if (isMounted) {
            setPermissionState(permissionStatus.state);
            
            // Listen for permission changes
            permissionStatus.onchange = () => {
              if (isMounted) {
                setPermissionState(permissionStatus.state);
                
                // If permission is granted after a change, initialize the scanner
                if (permissionStatus.state === 'granted') {
                  initializeCamera();
                } else if (permissionStatus.state === 'denied') {
                  setError('Camera permission was denied. Please allow camera access to scan QR codes.');
                  setIsInitializing(false);
                }
              }
            };
            
            // If already granted, proceed with initialization
            if (permissionStatus.state === 'granted') {
              initializeCamera();
            } else if (permissionStatus.state === 'prompt') {
              // We'll need to explicitly request access to trigger the permission prompt
              requestExplicitCameraAccess();
            } else if (permissionStatus.state === 'denied') {
              setError('Camera permission is denied. Please allow camera access in your browser settings.');
              setIsInitializing(false);
            }
          }
        } else {
          // Fallback for browsers without Permissions API - directly request access
          requestExplicitCameraAccess();
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error checking camera permission:', err);
          // Fallback to direct access request
          requestExplicitCameraAccess();
        }
      }
    };
    
    const requestExplicitCameraAccess = async () => {
      try {
        // Directly request camera access to trigger the browser permission dialog
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: cameraFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        if (isMounted) {
          // Stop the temporary stream
          stream.getTracks().forEach(track => track.stop());
          // Now proceed with initialization
          initializeCamera();
        }
      } catch (err) {
        if (isMounted) {
          console.error('Camera access error:', err);
          setError('Failed to access camera: ' + (err as Error).message);
          setIsInitializing(false);
          onError?.(err as Error);
        }
      }
    };
    
    const initializeCamera = async () => {
      try {
        // Get available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        
        if (isMounted) {
          setCameraList(cameras);
          
          // Select appropriate camera
          if (cameras.length > 0) {
            // Try to find back camera for mobile devices
            const backCamera = cameras.find(camera => 
              /back|rear|environment/i.test(camera.label)
            );
            
            const preferredCamera = cameraFacingMode === 'environment' 
              ? backCamera || cameras[0]
              : cameras.find(camera => /front|user/i.test(camera.label)) || cameras[0];
            
            setSelectedCamera(preferredCamera.deviceId);
          } else {
            setError('No cameras found on your device');
          }
          
          setIsInitializing(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Camera initialization error:', err);
          setError('Failed to initialize camera: ' + (err as Error).message);
          setIsInitializing(false);
          onError?.(err as Error);
        }
      }
    };
    
    requestCameraPermission();
    
    return () => {
      isMounted = false;
      // Clean up by stopping any active scanner
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [cameraFacingMode, onError]);

  // Start scanning when camera is selected
  useEffect(() => {
    if (!selectedCamera || !isActive || !videoRef.current) return;
    
    const codeReader = new BrowserQRCodeReader();
    let isMounted = true;
    
    const startScanning = async () => {
      try {
        if (videoRef.current) {
          try {
            // Configure hints via the proper API method
            // This is the correct way to set hints with zxing
            codeReader.hints.set(2, true); // TRY_HARDER hint for more thorough scanning
            codeReader.hints.set(3, true); // PURE_BARCODE hint to scan codes even with less contrast
            
            const controls = await codeReader.decodeFromVideoDevice(
              selectedCamera,
              videoRef.current,
              (result: Result | undefined, error: Error | undefined) => {
                if (!isMounted) return;
                
                if (result) {
                  // Handle successful scan
                  const qrData = result.getText();
                  console.log("QR code scanned successfully:", qrData);
                  onScanAction(qrData);
                  
                  // Reset scan attempts counter on successful scan
                  setScanAttempts(0);
                  
                  // Deactivate scanner temporarily to prevent duplicate scans
                  setIsActive(false);
                  
                  // Reactivate after delay
                  setTimeout(() => {
                    if (isMounted) {
                      setIsActive(true);
                    }
                  }, reactivateDelay);
                }
                
                if (error && error.name !== 'NotFoundException') {
                  console.error('Scanning error:', error);
                  // Only call onError for non-standard errors
                  if (error.name !== 'ChecksumException' && error.name !== 'FormatException') {
                    onError?.(error);
                    // Increment scan attempt counter
                    setScanAttempts(prev => prev + 1);
                    
                    // If we've had multiple failures, try resetting the scanner
                    if (scanAttempts > 5) {
                      resetScanner();
                    }
                  }
                }
              }
            );
            
            if (isMounted) {
              controlsRef.current = controls;
            } else {
              controls.stop();
            }
          } catch (err) {
            if (isMounted) {
              console.error('Scanner error:', err);
              setError('Scanner error: ' + (err as Error).message);
              onError?.(err as Error);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Scanner error:', err);
          setError('Scanner error: ' + (err as Error).message);
          onError?.(err as Error);
        }
      }
    };
    
    startScanning();
    
    return () => {
      isMounted = false;
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [selectedCamera, isActive, onScanAction, onError, reactivateDelay, scanAttempts]);

  // Reset the scanner in case of repeated failures
  const resetScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    
    setScanAttempts(0);
    setError(null);
    
    // Force a refresh of the camera selection
    const currentCamera = selectedCamera;
    setSelectedCamera(null);
    
    // Small delay before reactivating
    setTimeout(() => {
      setSelectedCamera(currentCamera);
    }, 500);
  };

  // Handle camera selection change
  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCameraId = e.target.value;
    setSelectedCamera(newCameraId);
    
    // Stop current scanner
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    
    // Reset errors and attempts
    setError(null);
    setScanAttempts(0);
  };

  // Reset error and try again
  const handleRetry = () => {
    setError(null);
    setScanAttempts(0);
    setIsInitializing(true);
    
    // Force a delay before retrying
    setTimeout(() => {
      const currentFacingMode = cameraFacingMode;
      // Toggle camera mode to force a refresh
      const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
      
      // Stop current scanner if active
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      
      // Request camera access again
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      }).then(stream => {
        // Stop the temporary stream
        stream.getTracks().forEach(track => track.stop());
        
        // Re-initialize the camera
        navigator.mediaDevices.enumerateDevices().then(devices => {
          const cameras = devices.filter(device => device.kind === 'videoinput');
          
          if (cameras.length > 0) {
            setCameraList(cameras);
            
            // Select the appropriate camera again
            const backCamera = cameras.find(camera => 
              /back|rear|environment/i.test(camera.label)
            );
            
            const preferredCamera = currentFacingMode === 'environment' 
              ? backCamera || cameras[0]
              : cameras.find(camera => /front|user/i.test(camera.label)) || cameras[0];
            
            setSelectedCamera(preferredCamera.deviceId);
          }
          
          setIsInitializing(false);
        });
      }).catch(err => {
        console.error('Camera access error during retry:', err);
        setError('Failed to access camera during retry: ' + (err as Error).message);
        setIsInitializing(false);
      });
    }, 500);
  };

  return (
    <div className={cn('w-full rounded-xl overflow-hidden', className)}>
      {error ? (
        <div className="p-6 bg-dark-bg-tertiary rounded-xl border border-error/30 text-center">
          <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-error/10 text-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Camera Error</h3>
          <p className="text-red-300 mb-4">{error}</p>
          <Button 
            onClick={handleRetry}
            variant="default"
            size="md"
          >
            Try Again
          </Button>
        </div>
      ) : isInitializing ? (
        <div className="p-6 bg-dark-bg-tertiary rounded-xl border border-dark-border flex flex-col items-center justify-center min-h-[250px]">
          <Spinner variant="primary" size="lg" className="mb-4" />
          <p className="text-gray-300 animate-pulse">Initializing camera...</p>
        </div>
      ) : (
        <>
          {cameraList.length > 1 && (
            <div className="bg-dark-bg-tertiary border-b border-dark-border p-3">
              <label className="flex flex-col text-sm font-medium text-gray-300">
                <span className="mb-1.5">Camera</span>
                <select 
                  value={selectedCamera || ''} 
                  onChange={handleCameraChange}
                  className="bg-dark-bg-primary border border-dark-border text-white rounded-md px-3 py-1.5 text-sm focus:ring-primary/30 focus:border-primary/70"
                >
                  {cameraList.map(camera => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.substr(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          
          <div className="relative overflow-hidden aspect-video bg-black">
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-70"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-primary rounded-lg w-3/5 h-2/5">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary -translate-x-1 -translate-y-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary translate-x-1 -translate-y-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary -translate-x-1 translate-y-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary translate-x-1 translate-y-1"></div>
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 w-4/5 h-0.5 bg-primary/30"></div>
              {isActive && (
                <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse"></div>
              )}
            </div>
          </div>
          
          <div className="p-3 bg-dark-bg-tertiary border-t border-dark-border text-center">
            <p className="text-sm text-gray-300 font-medium">
              Position the QR code inside the frame
            </p>
          </div>
        </>
      )}
    </div>
  );
} 