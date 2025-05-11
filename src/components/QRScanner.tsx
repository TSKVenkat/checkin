'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserQRCodeReader, BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, Exception } from '@zxing/library';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: Error) => void;
  cameraFacingMode?: 'environment' | 'user';
  scanning?: boolean;
}

export default function QRScanner({ 
  onScan, 
  onError, 
  cameraFacingMode = 'environment',
  scanning = true
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(scanning);
  const [error, setError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  // Initialize scanner with proper hints for better performance
  useEffect(() => {
    const hints = new Map();
    // Set specific format to scan (QR codes)
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    // Increase scanning try-hard threshold for difficult codes
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    // Create reader with hints
    const codeReader = new BrowserMultiFormatReader(hints);
    readerRef.current = codeReader;

    // Get available cameras
    const getCameras = async () => {
      try {
        const devices = await codeReader.listVideoInputDevices();
        setAvailableCameras(devices);
        
        // Prefer back camera for mobile devices
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        
        if (backCamera) {
          setSelectedCamera(backCamera.deviceId);
        } else if (devices.length > 0) {
          setSelectedCamera(devices[0].deviceId);
        }
      } catch (err) {
        console.error('Failed to list cameras:', err);
      }
    };

    getCameras();

    // Clean up on unmount
    return () => {
      stopScanner();
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  // Start or stop scanner based on isScanning state and selectedCamera
  useEffect(() => {
    if (isScanning && selectedCamera) {
      startScanner(selectedCamera);
    } else {
      stopScanner();
    }
  }, [isScanning, selectedCamera]);

  // Effect to reflect external scanning prop
  useEffect(() => {
    setIsScanning(scanning);
  }, [scanning]);

  const startScanner = async (deviceId: string) => {
    try {
      stopScanner(); // Stop any existing scanner
      setError(null);
      
      if (!readerRef.current || !videoRef.current) return;
      
      // Request permissions with specific camera
      try {
        await navigator.mediaDevices.getUserMedia({ 
          video: { deviceId: { exact: deviceId } } 
        });
        setHasPermission(true);
      } catch (err) {
        setHasPermission(false);
        setError(`Camera permission denied: ${(err as Error).message}`);
        if (onError) onError(err as Error);
        return;
      }
      
      // Start continuous scanning with specific camera
      const controls = await readerRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            // Vibrate on success if supported
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
            
            // Play success sound
            const successSound = new Audio('/audio/beep.mp3');
            successSound.play().catch(e => console.log('Cannot play sound', e));
            
            // Provide result to caller
            onScan(result.getText());
          }
          
          if (error && !(error instanceof Exception && error.message.includes('No MultiFormat Readers'))) {
            console.error('QR Scanner error:', error);
            setError(`Scanning error: ${error.message}`);
            if (onError) onError(error);
          }
        }
      );
      
      controlsRef.current = controls;
      
    } catch (err) {
      console.error('QR Scanner startup error:', err);
      setHasPermission(false);
      setError(`Camera access error: ${(err as Error).message}`);
      if (onError) onError(err as Error);
    }
  };

  const stopScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleScanning = () => {
    setIsScanning(!isScanning);
  };

  const switchCamera = () => {
    if (availableCameras.length <= 1) return;
    
    const currentIndex = availableCameras.findIndex(
      camera => camera.deviceId === selectedCamera
    );
    
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    setSelectedCamera(availableCameras[nextIndex].deviceId);
  };

  return (
    <div className="qr-scanner w-full">
      <div className="video-container relative w-full h-64 md:h-96 bg-black rounded-lg overflow-hidden">
        {isScanning ? (
          <>
            <video 
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay 
              playsInline
              muted
            />
            <div className="absolute inset-0 z-10 pointer-events-none">
              <div className="flex items-center justify-center w-full h-full">
                <div className="relative w-64 h-64">
                  {/* Scan target */}
                  <div className="absolute inset-0 border-2 border-white rounded-lg"></div>
                  
                  {/* Corner highlights */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                  
                  {/* Scan line animation */}
                  <div className="absolute left-0 w-full h-1 bg-green-500 animate-scan-line"></div>
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
                <p>Position QR code inside the frame</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-900 text-white">
            <p>Camera is off</p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="controls flex justify-center mt-4 gap-2">
        <button
          onClick={toggleScanning}
          className={`px-4 py-2 rounded-md ${
            isScanning 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isScanning ? 'Stop Camera' : 'Start Camera'}
        </button>
        
        {isScanning && availableCameras.length > 1 && (
          <button
            onClick={switchCamera}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-md"
          >
            Switch Camera
          </button>
        )}
      </div>
      
      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0%;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0%;
          }
        }
        .animate-scan-line {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  );
} 