import SwiftUI
@preconcurrency import AVFoundation
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

// Helper struct for decoding user profile
struct UserTastingProfile: Decodable {
    let tasting_note_style: String?
}

// Helper struct for encoding pending tasting notes
struct PendingTastingNotes: Encodable {
    let rating: Int
    let notes: String
    let detailed_notes: String?
    let location_name: String?
    let location_city: String?
}

// MARK: - Scan Result View
struct ScanResultView: View {
    let image: UIImage
    @EnvironmentObject var hapticManager: HapticManager
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    // Processing state
    @State private var isUploading = false  // Changed to false so form is interactive immediately
    @State private var isProcessingImage = true  // Separate state for background upload
    @State private var winesAddedId: String?
    @State private var errorMessage: String?
    @State private var showingError = false

    // Tasting entry
    @State private var tastingStyle: TastingStyle = .casual
    @State private var rating: Int = 0
    @State private var notes = ""
    @State private var detailedNotes = ""
    @State private var locationName = ""
    @State private var locationCity = ""

    enum TastingStyle: String, CaseIterable {
        case casual = "casual"
        case sommelier = "sommelier"
        case winemaker = "winemaker"

        var title: String {
            switch self {
            case .casual: return "Casual"
            case .sommelier: return "Sommelier"
            case .winemaker: return "Winemaker"
            }
        }

        var description: String {
            switch self {
            case .casual: return "Quick notes and rating"
            case .sommelier: return "Service and pairing notes"
            case .winemaker: return "Technical production details"
            }
        }

        var prompt: String {
            switch self {
            case .casual: return "How was this wine?"
            case .sommelier: return "Describe the wine's profile and food pairings"
            case .winemaker: return "Note the technical aspects and winemaking details"
            }
        }
    }

    private var wineImageView: some View {
        Image(uiImage: image)
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(maxHeight: 200)
            .cornerRadius(16)
            .padding(.horizontal)
            .padding(.top)
    }

    private var uploadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(.vinoAccent)

            Text("Uploading wine...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.vinoText)
        }
        .frame(height: 100)
        .frame(maxWidth: .infinity)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    wineImageView

                    // Show status message
                    HStack(spacing: 12) {
                        if isProcessingImage {
                            ProgressView()
                                .scaleEffect(0.8)
                                .tint(.vinoAccent)
                        } else {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.green)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(isProcessingImage ? "Uploading wine photo..." : "Wine uploaded successfully!")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.vinoText)
                            Text(isProcessingImage ? "You can start adding your notes while we process the image." : "AI is analyzing the label. Add your tasting notes below.")
                                .font(.system(size: 13))
                                .foregroundColor(.vinoTextSecondary)
                        }
                        Spacer()
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.green.opacity(0.1))
                    )
                    .padding(.horizontal)

                    // Tasting form is always visible now
                    VStack(spacing: 20) {

                            // No tasting style selector - using user's profile preference

                            // Rating
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Rating")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.vinoTextSecondary)
                                    .padding(.horizontal)

                                HStack(spacing: 12) {
                                    ForEach(1...5, id: \.self) { star in
                                        Button {
                                            rating = star
                                            hapticManager.lightImpact()
                                        } label: {
                                            Image(systemName: star <= rating ? "star.fill" : "star")
                                                .font(.system(size: 28))
                                                .foregroundColor(star <= rating ? .vinoGold : .vinoBorder)
                                        }
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                            }

                            // Notes based on style
                            VStack(alignment: .leading, spacing: 12) {
                                Text(tastingStyle.prompt)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.vinoTextSecondary)
                                    .padding(.horizontal)

                                TextField("Add your notes...", text: $notes, axis: .vertical)
                                    .textFieldStyle(.plain)
                                    .padding(16)
                                    .lineLimit(4...8)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(Color.vinoDarkSecondary)
                                    )
                                    .padding(.horizontal)

                                if tastingStyle == .winemaker {
                                    Text("Technical Details")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(.vinoTextSecondary)
                                        .padding(.horizontal)
                                        .padding(.top, 8)

                                    TextField("Winemaking techniques, oak treatment, fermentation...", text: $detailedNotes, axis: .vertical)
                                        .textFieldStyle(.plain)
                                        .padding(16)
                                        .lineLimit(4...8)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(Color.vinoDarkSecondary)
                                        )
                                        .padding(.horizontal)
                                }
                            }

                            // Location
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Image(systemName: "mappin.circle")
                                        .font(.system(size: 16))
                                        .foregroundColor(.vinoAccent)
                                    Text("Where are you tasting?")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(.vinoTextSecondary)
                                }
                                .padding(.horizontal)

                                VStack(spacing: 12) {
                                    TextField("Location name (restaurant, bar, home...)", text: $locationName)
                                        .textFieldStyle(.plain)
                                        .padding(16)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(Color.vinoDarkSecondary)
                                        )

                                    TextField("City (optional)", text: $locationCity)
                                        .textFieldStyle(.plain)
                                        .padding(16)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(Color.vinoDarkSecondary)
                                        )
                                }
                                .padding(.horizontal)
                            }
                        }
                        .padding(.bottom, 20)
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
                            await saveTastingNotes()
                        }
                    }
                    .fontWeight(.semibold)
                    .disabled(isUploading)
                }
            }
            .alert("Error", isPresented: $showingError) {
                Button("OK") { }
            } message: {
                Text(errorMessage ?? "An error occurred")
            }
        }
        .onAppear {
            Task {
                // Load user's tasting style preference from profile
                await loadUserProfile()
                await uploadAndProcessWineImage()
            }
        }
    }

    private func loadUserProfile() async {
        do {
            let session = try await SupabaseManager.shared.client.auth.session
            let userId = session.user.id.uuidString.lowercased()

            let response = try await SupabaseManager.shared.client
                .from("user_profiles")
                .select("tasting_note_style")
                .eq("user_id", value: userId)
                .single()
                .execute()

            let data = response.data
            if let jsonData = try? JSONSerialization.data(withJSONObject: data),
               let profile = try? JSONDecoder().decode(UserTastingProfile.self, from: jsonData),
               let style = TastingStyle(rawValue: profile.tasting_note_style ?? "casual") {
                tastingStyle = style
            }
        } catch {
            print("Failed to load user profile: \(error)")
            tastingStyle = .casual // Default to casual
        }
    }

    private func saveTastingNotes() async {
        // Save the tasting notes - they'll be associated with the wine once processing completes
        guard let winesAddedId = winesAddedId else {
            dismiss()
            return
        }

        // Store the tasting data to the wines_added table to be picked up by edge function
        let pendingNotes = PendingTastingNotes(
            rating: rating,
            notes: notes,
            detailed_notes: detailedNotes.isEmpty ? nil : detailedNotes,
            location_name: locationName.isEmpty ? nil : locationName,
            location_city: locationCity.isEmpty ? nil : locationCity
        )

        // Update wines_added with pending tasting notes
        do {
            try await SupabaseManager.shared.client
                .from("wines_added")
                .update(["pending_tasting_notes": pendingNotes])
                .eq("id", value: winesAddedId)
                .execute()

            print("Saved pending tasting notes to wines_added: \(winesAddedId)")
        } catch {
            print("Failed to save pending tasting notes: \(error)")
        }

        dismiss()
    }

    private func uploadAndProcessWineImage() async {
        // Compress image with lower quality for faster upload
        guard let imageData = image.jpegData(compressionQuality: 0.5) else {
            errorMessage = "Failed to process image"
            isProcessingImage = false
            showingError = true
            return
        }

        do {
            // Get current user
            let session = try await SupabaseManager.shared.client.auth.session
            let user = session.user
            let userIdString = user.id.uuidString.lowercased()
            let fileName = "\(userIdString)/\(Date().timeIntervalSince1970).jpg"

            // Create IDs upfront
            let scanId = UUID()
            let queueId = UUID()
            let publicUrl = try SupabaseManager.shared.client.storage
                .from("scans")
                .getPublicURL(path: fileName)

            // Store the wines_added ID immediately for tasting notes
            self.winesAddedId = queueId.uuidString

            // Run database operations concurrently
            async let uploadTask = SupabaseManager.shared.client.storage
                .from("scans")
                .upload(
                    fileName,
                    data: imageData,
                    options: .init(contentType: "image/jpeg")
                )

            async let scanTask = SupabaseManager.shared.client
                .from("scans")
                .insert([
                    "id": scanId.uuidString,
                    "user_id": userIdString,
                    "image_path": fileName,
                    "scan_image_url": publicUrl.absoluteString
                ])
                .execute()

            async let queueTask = SupabaseManager.shared.client
                .from("wines_added")
                .insert([
                    "id": queueId.uuidString,
                    "user_id": userIdString,
                    "image_url": publicUrl.absoluteString,
                    "scan_id": scanId.uuidString,
                    "status": "pending"
                ])
                .execute()

            // Wait for all operations to complete
            let _ = try await (uploadTask, scanTask, queueTask)

            // Trigger edge function in background (don't wait)
            Task {
                struct EmptyBody: Encodable {}
                _ = try? await SupabaseManager.shared.client.functions
                    .invoke("process-wine-queue", options: FunctionInvokeOptions(body: EmptyBody()))
            }

            // Show success immediately
            await MainActor.run {
                isProcessingImage = false
                hapticManager.success()
            }

        } catch {
            await MainActor.run {
                errorMessage = "Failed to upload wine: \(error.localizedDescription)"
                isProcessingImage = false
                showingError = true
                hapticManager.error()
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
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
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

            DispatchQueue.main.async {
                let previewLayer = AVCaptureVideoPreviewLayer(session: session)
                previewLayer.frame = view.bounds
                previewLayer.videoGravity = .resizeAspectFill
                view.layer.addSublayer(previewLayer)

                self?.captureSession = session
                self?.photoOutput = output
                self?.previewLayer = previewLayer

                // Start the session on background thread
                DispatchQueue.global(qos: .userInitiated).async {
                    session.startRunning()
                }
            }
        }
    }

    func startSession() {
        guard let session = captureSession else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
        }
    }

    func stopSession() {
        guard let session = captureSession else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            session.stopRunning()
        }
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