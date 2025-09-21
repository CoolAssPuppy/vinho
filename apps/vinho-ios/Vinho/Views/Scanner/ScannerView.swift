import SwiftUI
import AVFoundation
import Vision

/// Innovative wine scanner with AI-powered recognition
struct ScannerView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = ScannerViewModel()
    @State private var capturedImage: UIImage?
    @State private var showingResult = false
    @State private var flashOn = false
    @State private var scanAnimation = false
    
    var body: some View {
        NavigationView {
            ZStack {
                // Camera View
                CameraView(viewModel: viewModel)
                    .ignoresSafeArea()
                
                // Scanning Overlay
                scanningOverlay
                
                // Controls
                VStack {
                    // Top Bar
                    topBar
                    
                    Spacer()
                    
                    // Bottom Controls
                    bottomControls
                }
            }
            .navigationBarHidden(true)
            .preferredColorScheme(.dark)
            .onAppear {
                viewModel.startSession()
                startScanAnimation()
            }
            .onDisappear {
                viewModel.stopSession()
            }
            .sheet(isPresented: $showingResult) {
                if let image = capturedImage {
                    ScanResultView(image: image, viewModel: viewModel)
                        .environmentObject(hapticManager)
                }
            }
        }
    }
    
    var scanningOverlay: some View {
        ZStack {
            // Dark overlay with cutout
            Color.black.opacity(0.6)
                .ignoresSafeArea()
                .overlay(
                    RoundedRectangle(cornerRadius: 30)
                        .frame(width: 300, height: 400)
                        .blendMode(.destinationOut)
                )
                .compositingGroup()
            
            // Scanning Frame
            RoundedRectangle(cornerRadius: 30)
                .stroke(
                    LinearGradient.vinoGradient,
                    lineWidth: 3
                )
                .frame(width: 300, height: 400)
                .shadow(color: .vinoPrimary.opacity(0.5), radius: 10)
            
            // Animated Scan Line
            if scanAnimation {
                Rectangle()
                    .fill(LinearGradient.vinoGradient)
                    .frame(width: 280, height: 2)
                    .offset(y: scanAnimation ? 180 : -180)
                    .animation(
                        Animation.linear(duration: 2)
                            .repeatForever(autoreverses: true),
                        value: scanAnimation
                    )
            }
            
            // Instructions
            VStack {
                Spacer()
                    .frame(height: 500)
                
                VStack(spacing: 12) {
                    Image(systemName: "camera.viewfinder")
                        .font(.system(size: 40))
                        .foregroundColor(.vinoAccent)
                    
                    Text("Position wine label in frame")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                    
                    Text("Ensure good lighting and avoid glare")
                        .font(.system(size: 14))
                        .foregroundColor(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                    
                    // Privacy Notice
                    HStack(spacing: 8) {
                        Image(systemName: "lock.shield")
                            .font(.system(size: 12))
                        Text("Images processed by third-party AI")
                            .font(.system(size: 11))
                    }
                    .foregroundColor(.white.opacity(0.6))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(
                        Capsule()
                            .fill(Color.black.opacity(0.3))
                    )
                    .padding(.top, 8)
                }
                .padding(.horizontal, 40)
            }
        }
    }
    
    var topBar: some View {
        HStack {
            Button {
                hapticManager.lightImpact()
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle()
                            .fill(Color.black.opacity(0.3))
                            .backdrop()
                    )
            }
            
            Spacer()
            
            Button {
                hapticManager.lightImpact()
                flashOn.toggle()
                viewModel.toggleFlash(flashOn)
            } label: {
                Image(systemName: flashOn ? "bolt.fill" : "bolt")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(flashOn ? .vinoGold : .white)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle()
                            .fill(Color.black.opacity(0.3))
                            .backdrop()
                    )
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 50)
    }
    
    var bottomControls: some View {
        VStack(spacing: 20) {
            // Capture Button
            Button {
                hapticManager.heavyImpact()
                capturePhoto()
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.white)
                        .frame(width: 70, height: 70)
                    
                    Circle()
                        .stroke(LinearGradient.vinoGradient, lineWidth: 4)
                        .frame(width: 80, height: 80)
                }
            }
            .scaleEffect(viewModel.isCapturing ? 0.9 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: viewModel.isCapturing)
            
            // Gallery Button
            Button {
                hapticManager.lightImpact()
                // Open photo library
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "photo")
                    Text("Choose from Library")
                        .fontWeight(.medium)
                }
                .font(.system(size: 16))
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(
                    Capsule()
                        .fill(Color.black.opacity(0.3))
                        .backdrop()
                )
            }
        }
        .padding(.bottom, 40)
    }
    
    func startScanAnimation() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            scanAnimation = true
        }
    }
    
    func capturePhoto() {
        viewModel.capturePhoto { image in
            capturedImage = image
            showingResult = true
        }
    }
}

// MARK: - Camera View
struct CameraView: UIViewRepresentable {
    @ObservedObject var viewModel: ScannerViewModel
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: UIScreen.main.bounds)
        viewModel.setupCamera(in: view)
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {}
}

// MARK: - Scan Result View
struct ScanResultView: View {
    let image: UIImage
    @ObservedObject var viewModel: ScannerViewModel
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var wineInfo: ScannedWineInfo?
    @State private var isProcessing = true
    @State private var showingEditView = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color.vinoDark.ignoresSafeArea()
                
                if isProcessing {
                    processingView
                } else if let wine = wineInfo {
                    resultContent(wine: wine)
                } else {
                    errorView
                }
            }
            .navigationTitle("Scan Result")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        hapticManager.lightImpact()
                        dismiss()
                    }
                    .foregroundColor(.vinoAccent)
                }
                
                if wineInfo != nil {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Save") {
                            hapticManager.success()
                            saveWine()
                            dismiss()
                        }
                        .foregroundColor(.vinoAccent)
                        .fontWeight(.semibold)
                    }
                }
            }
            .onAppear {
                processImage()
            }
        }
    }
    
    var processingView: some View {
        VStack(spacing: 24) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .vinoAccent))
                .scaleEffect(1.5)
            
            Text("Analyzing Wine Label...")
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(.vinoText)
            
            Text("Using AI to identify wine details")
                .font(.system(size: 14))
                .foregroundColor(.vinoTextSecondary)
        }
    }
    
    func resultContent(wine: ScannedWineInfo) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                // Scanned Image
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxHeight: 300)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)
                
                // Confidence Score
                HStack {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundColor(.vinoSuccess)
                    Text("\(Int(wine.confidence * 100))% Match Confidence")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.vinoText)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(Color.vinoSuccess.opacity(0.2))
                )
                
                // Wine Details
                VStack(alignment: .leading, spacing: 16) {
                    Text("Detected Wine Information")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.vinoText)
                    
                    DetailField(label: "Producer", value: wine.producer, isEditable: true)
                    DetailField(label: "Wine Name", value: wine.name, isEditable: true)
                    DetailField(label: "Vintage", value: wine.vintage, isEditable: true)
                    DetailField(label: "Region", value: wine.region, isEditable: true)
                    DetailField(label: "Varietal", value: wine.varietal, isEditable: true)
                }
                .padding(20)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color.vinoDarkSecondary)
                )
                
                // Edit Button
                Button {
                    hapticManager.lightImpact()
                    showingEditView = true
                } label: {
                    HStack {
                        Image(systemName: "pencil")
                        Text("Edit Details")
                    }
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.vinoAccent)
                }
            }
            .padding()
        }
    }
    
    var errorView: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundColor(.vinoError)
            
            Text("Could Not Identify Wine")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.vinoText)
            
            Text("Try taking another photo with better lighting")
                .font(.system(size: 14))
                .foregroundColor(.vinoTextSecondary)
                .multilineTextAlignment(.center)
            
            Button {
                hapticManager.lightImpact()
                dismiss()
            } label: {
                Text("Try Again")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 12)
                    .background(LinearGradient.vinoGradient)
                    .clipShape(Capsule())
            }
        }
        .padding()
    }
    
    func processImage() {
        // Simulate processing
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            wineInfo = ScannedWineInfo(
                producer: "Château Margaux",
                name: "Margaux",
                vintage: "2019",
                region: "Bordeaux, France",
                varietal: "Cabernet Sauvignon",
                confidence: 0.92
            )
            isProcessing = false
            hapticManager.success()
        }
    }
    
    func saveWine() {
        // Save to database
    }
}

// MARK: - Supporting Views
struct DetailField: View {
    let label: String
    let value: String
    let isEditable: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.vinoTextSecondary)
                .textCase(.uppercase)
            
            HStack {
                Text(value)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.vinoText)
                
                Spacer()
                
                if isEditable {
                    Image(systemName: "pencil")
                        .font(.system(size: 12))
                        .foregroundColor(.vinoTextTertiary)
                }
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.vinoDark)
            )
        }
    }
}

// MARK: - View Model
@MainActor
class ScannerViewModel: NSObject, ObservableObject {
    @Published var isCapturing = false
    private var captureSession: AVCaptureSession?
    private var photoOutput: AVCapturePhotoOutput?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var captureCompletion: ((UIImage) -> Void)?
    
    func setupCamera(in view: UIView) {
        let session = AVCaptureSession()
        session.sessionPreset = .photo
        
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device) else { return }
        
        if session.canAddInput(input) {
            session.addInput(input)
        }
        
        let output = AVCapturePhotoOutput()
        if session.canAddOutput(output) {
            session.addOutput(output)
        }
        
        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.frame = view.bounds
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
        
        self.captureSession = session
        self.photoOutput = output
        self.previewLayer = previewLayer
    }
    
    func startSession() {
        Task {
            captureSession?.startRunning()
        }
    }
    
    func stopSession() {
        captureSession?.stopRunning()
    }
    
    func toggleFlash(_ on: Bool) {
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else { return }
        
        try? device.lockForConfiguration()
        device.torchMode = on ? .on : .off
        device.unlockForConfiguration()
    }
    
    func capturePhoto(completion: @escaping (UIImage) -> Void) {
        isCapturing = true
        captureCompletion = completion
        
        let settings = AVCapturePhotoSettings()
        photoOutput?.capturePhoto(with: settings, delegate: self)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.isCapturing = false
        }
    }
}

extension ScannerViewModel: AVCapturePhotoCaptureDelegate {
    nonisolated func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let data = photo.fileDataRepresentation(),
              let image = UIImage(data: data) else { return }
        
        Task { @MainActor in
            captureCompletion?(image)
        }
    }
}

// MARK: - Models
struct ScannedWineInfo {
    let producer: String
    let name: String
    let vintage: String
    let region: String
    let varietal: String
    let confidence: Double
}

// MARK: - Backdrop Blur Extension
extension View {
    func backdrop() -> some View {
        self.background(BackdropBlur())
    }
}

struct BackdropBlur: UIViewRepresentable {
    func makeUIView(context: Context) -> UIVisualEffectView {
        UIVisualEffectView(effect: UIBlurEffect(style: .dark))
    }
    
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {}
}