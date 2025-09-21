import SwiftUI
import AVFoundation
import PhotosUI

struct ScannerView: View {
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = ScannerViewModel()
    @State private var showingImagePicker = false
    @State private var selectedItem: PhotosPickerItem?
    @State private var capturedImage: UIImage?
    @State private var showingResult = false
    @State private var flashOn = false

    var body: some View {
        ZStack {
            // Camera View - Full Screen
            CameraView(viewModel: viewModel)
                .ignoresSafeArea()

            // Gradient overlays for better UI visibility
            VStack {
                LinearGradient(
                    colors: [Color.black.opacity(0.7), Color.clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 200)
                .ignoresSafeArea()

                Spacer()

                LinearGradient(
                    colors: [Color.clear, Color.black.opacity(0.7)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 250)
                .ignoresSafeArea()
            }

            // UI Controls
            VStack {
                // Top Bar
                HStack {
                    // Close Button
                    Button {
                        hapticManager.lightImpact()
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .background(
                                Circle()
                                    .fill(Color.white.opacity(0.2))
                            )
                    }

                    Spacer()

                    // Flash Button
                    Button {
                        hapticManager.lightImpact()
                        flashOn.toggle()
                        viewModel.toggleFlash(flashOn)
                    } label: {
                        Image(systemName: flashOn ? "bolt.fill" : "bolt.slash.fill")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(flashOn ? .yellow : .white)
                            .frame(width: 40, height: 40)
                            .background(
                                Circle()
                                    .fill(Color.white.opacity(0.2))
                            )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 60)

                Spacer()

                // Center Frame Guide
                VStack(spacing: 20) {
                    // Frame
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.white.opacity(0.5), lineWidth: 2)
                        .frame(width: 280, height: 380)
                        .overlay(
                            // Corner markers
                            ZStack {
                                // Top left
                                Path { path in
                                    path.move(to: CGPoint(x: 0, y: 30))
                                    path.addLine(to: CGPoint(x: 0, y: 0))
                                    path.addLine(to: CGPoint(x: 30, y: 0))
                                }
                                .stroke(Color.white, lineWidth: 3)

                                // Top right
                                Path { path in
                                    path.move(to: CGPoint(x: 250, y: 0))
                                    path.addLine(to: CGPoint(x: 280, y: 0))
                                    path.addLine(to: CGPoint(x: 280, y: 30))
                                }
                                .stroke(Color.white, lineWidth: 3)

                                // Bottom left
                                Path { path in
                                    path.move(to: CGPoint(x: 0, y: 350))
                                    path.addLine(to: CGPoint(x: 0, y: 380))
                                    path.addLine(to: CGPoint(x: 30, y: 380))
                                }
                                .stroke(Color.white, lineWidth: 3)

                                // Bottom right
                                Path { path in
                                    path.move(to: CGPoint(x: 250, y: 380))
                                    path.addLine(to: CGPoint(x: 280, y: 380))
                                    path.addLine(to: CGPoint(x: 280, y: 350))
                                }
                                .stroke(Color.white, lineWidth: 3)
                            }
                        )

                    // Instructions
                    Text("Position wine label in frame")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.white)
                }

                Spacer()

                // Bottom Controls
                VStack(spacing: 20) {
                    // Capture Controls
                    HStack(alignment: .center, spacing: 40) {
                        // Library Button
                        Button {
                            hapticManager.lightImpact()
                            showingImagePicker = true
                        } label: {
                            VStack(spacing: 4) {
                                Image(systemName: "photo.on.rectangle")
                                    .font(.system(size: 24))
                                    .foregroundColor(.white)
                            }
                            .frame(width: 50, height: 50)
                        }

                        // Capture Button
                        Button {
                            hapticManager.heavyImpact()
                            capturePhoto()
                        } label: {
                            ZStack {
                                Circle()
                                    .stroke(Color.white, lineWidth: 3)
                                    .frame(width: 75, height: 75)

                                Circle()
                                    .fill(Color.white)
                                    .frame(width: 65, height: 65)
                            }
                        }
                        .scaleEffect(viewModel.isCapturing ? 0.9 : 1.0)
                        .animation(.spring(response: 0.1, dampingFraction: 0.6), value: viewModel.isCapturing)

                        // Spacer for balance
                        Color.clear
                            .frame(width: 50, height: 50)
                    }
                }
                .padding(.bottom, 50)
            }
        }
        .onAppear {
            viewModel.startSession()
        }
        .onDisappear {
            viewModel.stopSession()
        }
        .photosPicker(
            isPresented: $showingImagePicker,
            selection: $selectedItem,
            matching: .images
        )
        .onChange(of: selectedItem) { _, newItem in
            Task {
                if let data = try? await newItem?.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    capturedImage = image
                    showingResult = true
                }
            }
        }
        .sheet(isPresented: $showingResult) {
            if let image = capturedImage {
                ScanResultView(image: image)
                    .environmentObject(hapticManager)
            }
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
        view.backgroundColor = .black
        viewModel.setupCamera(in: view)
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}
}

// MARK: - Scan Result View
struct ScanResultView: View {
    let image: UIImage
    @EnvironmentObject var hapticManager: HapticManager
    @Environment(\.dismiss) private var dismiss
    @State private var wineName = ""
    @State private var producer = ""
    @State private var vintage = ""
    @State private var region = ""
    @State private var isProcessing = true

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Wine Image
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxHeight: 250)
                        .cornerRadius(16)
                        .padding(.top)

                    if isProcessing {
                        // Processing View
                        VStack(spacing: 16) {
                            ProgressView()
                                .scaleEffect(1.2)
                                .tint(.vinoPrimary)

                            Text("Analyzing wine label...")
                                .font(.system(size: 16))
                                .foregroundColor(.secondary)
                        }
                        .frame(height: 200)
                        .frame(maxWidth: .infinity)
                    } else {
                        // Wine Details Form
                        VStack(alignment: .leading, spacing: 20) {
                            Text("Wine Details")
                                .font(.system(size: 20, weight: .semibold))

                            Group {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Producer")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.secondary)
                                    TextField("Enter producer name", text: $producer)
                                        .textFieldStyle(.roundedBorder)
                                }

                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Wine Name")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.secondary)
                                    TextField("Enter wine name", text: $wineName)
                                        .textFieldStyle(.roundedBorder)
                                }

                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Vintage")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.secondary)
                                    TextField("Enter year", text: $vintage)
                                        .textFieldStyle(.roundedBorder)
                                        .keyboardType(.numberPad)
                                }

                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Region")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.secondary)
                                    TextField("Enter region", text: $region)
                                        .textFieldStyle(.roundedBorder)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }
            .navigationTitle("Add Wine")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        hapticManager.success()
                        // Save wine
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(isProcessing || wineName.isEmpty || producer.isEmpty)
                }
            }
        }
        .onAppear {
            // Simulate AI processing
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                // Mock data - in production this would come from AI
                producer = "Château Margaux"
                wineName = "Margaux"
                vintage = "2019"
                region = "Bordeaux, France"
                isProcessing = false
                hapticManager.success()
            }
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