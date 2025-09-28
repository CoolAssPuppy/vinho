import SwiftUI
import AVFoundation
import PhotosUI
import Supabase
import Storage
import Functions

// MARK: - Toast View
struct ToastView: View {
    let message: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
                .font(.system(size: 20))

            Text(message)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.black.opacity(0.9))
        )
        .padding(.horizontal, 16)
        .padding(.top, 50) // Account for safe area
    }
}

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
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var scanId: String?
    @State private var showToast = false
    @State private var toastMessage = ""

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

                            Text("Our AI sommeliers are examining your wine")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary.opacity(0.7))
                                .multilineTextAlignment(.center)
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

                            if errorMessage != nil {
                                Text("Note: AI processing is in progress. You can check your journal for updates.")
                                    .font(.system(size: 12))
                                    .foregroundColor(.orange)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(Color.orange.opacity(0.1))
                                    .cornerRadius(8)
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
                        Task {
                            await saveWineToJournal()
                        }
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(isProcessing)
                }
            }
            .alert("Error", isPresented: $showingError) {
                Button("OK") { }
            } message: {
                Text(errorMessage ?? "An error occurred")
            }
            .overlay(alignment: .top) {
                if showToast {
                    ToastView(message: toastMessage)
                        .transition(.move(edge: .top).combined(with: .opacity))
                        .onAppear {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                                withAnimation {
                                    showToast = false
                                }
                            }
                        }
                }
            }
        }
        .onAppear {
            Task {
                await uploadAndProcessWineImage()
            }
        }
    }

    private func uploadAndProcessWineImage() async {
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            errorMessage = "Failed to process image"
            isProcessing = false
            return
        }

        do {
            // Get current user
            let session = try await SupabaseManager.shared.client.auth.session
            let user = session.user

            // Upload image to storage
            // Use lowercased UUID string to match auth.uid() format
            let userIdString = user.id.uuidString.lowercased()
            let fileName = "\(userIdString)/\(Date().timeIntervalSince1970).jpg"
            let imageDataForUpload = imageData // Use original data, not re-encoded

            do {
                try await SupabaseManager.shared.client.storage
                    .from("scans")
                    .upload(
                        fileName,
                        data: imageDataForUpload,
                        options: .init(contentType: "image/jpeg")
                    )
            } catch {
                throw NSError(domain: "ScannerView", code: 1, userInfo: [NSLocalizedDescriptionKey: "Storage upload failed: \(error.localizedDescription)"])
            }

            // Get public URL
            let publicUrl = try SupabaseManager.shared.client.storage
                .from("scans")
                .getPublicURL(path: fileName)

            // Create scan record
            let scanId = UUID()
            let scanData = [
                "id": scanId.uuidString,
                "user_id": userIdString,
                "image_path": fileName,
                "scan_image_url": publicUrl.absoluteString
            ]

            do {
                try await SupabaseManager.shared.client
                    .from("scans")
                    .insert(scanData)
                    .execute()
            } catch {
                throw NSError(domain: "ScannerView", code: 2, userInfo: [NSLocalizedDescriptionKey: "Scans table insert failed: \(error.localizedDescription)"])
            }

            self.scanId = scanId.uuidString

            // Add to processing queue
            let queueData = [
                "user_id": userIdString,
                "image_url": publicUrl.absoluteString,
                "scan_id": scanId.uuidString,
                "status": "pending"
            ]

            do {
                try await SupabaseManager.shared.client
                    .from("wines_added")
                    .insert(queueData)
                    .execute()
            } catch {
                throw NSError(domain: "ScannerView", code: 3, userInfo: [NSLocalizedDescriptionKey: "wines_added table insert failed: \(error.localizedDescription)"])
            }

            // Trigger edge function to process immediately
            struct EmptyBody: Encodable {}
            _ = try? await SupabaseManager.shared.client.functions
                .invoke("process-wine-queue", options: FunctionInvokeOptions(body: EmptyBody()))

            // Show success toast and dismiss scanner
            await MainActor.run {
                isProcessing = false
                toastMessage = "Wine uploaded! Processing in background..."
                showToast = true
                hapticManager.success()

                // Dismiss the scanner after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    dismiss()
                }
            }

        } catch {
            await MainActor.run {
                errorMessage = "Failed to upload wine: \(error.localizedDescription)"
                isProcessing = false
                showingError = true
                hapticManager.error()
            }
        }
    }

    private func saveWineToJournal() async {
        // The wine is already being processed in the background
        // This just dismisses the view
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