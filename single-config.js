    class ConfiguratorPage {
        constructor() {
            this.XANO_API_URL = "https://x2xj-hiw3-yjhd.t7.xano.io/api:0K4rr2yl";
            this.currentConfig = {
                model: null,
                engine: null,
                trim: null,
                color: null,
                retail: null,
            };
            this.state = {
                currentView: "exterior",
                selectedColor: null,
                selectedArea: null,
                selectedDealer: null,
            };
            this.sliders = {
                exterior: null,
                interior: null,
            };

            this.init();
            this.initializeSliders();
            this.initializeEventListeners();
        }

        initializeSliders() {
            // 初始化外裝輪播
            const exteriorElement = document.querySelector(".exterior-carousel");
            if (exteriorElement) {
                this.sliders.exterior = new Splide(".exterior-carousel", {
                    type: "slide",
                    perPage: 1,
                    perMove: 1,
                    pagination: false,
                    arrows: true,
                }).mount();
                exteriorElement.style.display = "block";
            }
            // 初始化內裝輪播
            const interiorElement = document.querySelector(".interior-carousel");
            if (interiorElement) {
                this.sliders.interior = new Splide(".interior-carousel", {
                    type: "slide",
                    perPage: 1,
                    perMove: 1,
                    pagination: false,
                    arrows: true,
                    gap: "1em",
                }).mount();
                interiorElement.style.display = "none";
            }
            // 設置初始視圖狀態
            this.state.currentView = "exterior";
        }

        initializeEventListeners() {
            const viewToggles = document.querySelectorAll('[name="view"]');
            viewToggles.forEach((toggle) => {
                toggle.addEventListener("change", (e) => {
                    this.switchView(e.target.value);
                });
            });

            const areaSelect = document.getElementById("area");
            if (areaSelect) {
                areaSelect.addEventListener("change", (e) => {
                    const selectedArea = e.target.value;
                    console.log("Area changed to:", selectedArea);
                    this.handleAreaChange(selectedArea);
                });
            }

            this.initializePaymentToggle();
        }

        getBrandIdFromSlug(brandSlug) {
            const brandMapping = {
                'peugeot': 1,
                'citroen': 2
            };
            return brandMapping[brandSlug];
        }

        async init() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const modelSlug = urlParams.get("model");

                if (!modelSlug) {
                    throw new Error("Missing model parameter");
                }

                const model = await this.fetchModelBySlug(modelSlug);
                this.currentConfig.model = model;

                await this.initializeConfigurator();
                if (this.currentConfig.model) {
                    await this.loadAreaOptions();
                    await this.loadConfigurationData();
                    await this.updateEngineOptions();
                    this.initializeInstallmentListeners();
                    this.initializePaymentToggle();
                    this.initializeSliders();
                }
                const loadingScreen = document.getElementById('loading-screen');
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500); // Match with CSS transition duration

            } catch (error) {
                console.error("Initialization error:", error);
                this.showError("無法載入配置器");
                
                const loadingScreen = document.getElementById('loading-screen');
                loadingScreen.classList.add('hidden');

                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        }

        async loadConfigurationData() {
            try {
                const response = await fetch(
                    `${this.XANO_API_URL}/configuration-details?model_id=${this.currentConfig.model.id}`
                );
                if (!response.ok) throw new Error("Failed to fetch configuration data");

                this.configurationData = await response.json();
                console.log("Loaded configuration data:", this.configurationData);
            } catch (error) {
                console.error("Error loading configuration data:", error);
                throw error;
            }
        }

        switchView(view) {
            const exteriorElement = document.querySelector(".exterior-carousel");
            const interiorElement = document.querySelector(".interior-carousel");
            // 更新視圖顯示
            if (view === "exterior") {
                if (exteriorElement) exteriorElement.style.display = "block";
                if (interiorElement) interiorElement.style.display = "none";
                if (this.sliders.exterior) this.sliders.exterior.refresh();
            } else {
                if (exteriorElement) exteriorElement.style.display = "none";
                if (interiorElement) interiorElement.style.display = "block";
                if (this.sliders.interior) this.sliders.interior.refresh();
            }
            // 更新 radio button 狀態
            const radioInput = document.querySelector(
                `input[name="view"][value="${view}"]`
            );
            if (radioInput) {
                radioInput.checked = true;
            }

            this.state.currentView = view;
        }

        initializePaymentToggle() {
            const paymentInputs = document.querySelectorAll('input[name="payment"]');
            const paymentContents = document.querySelectorAll(".payment_content");
            // 初始隱藏分期付款內容
            paymentContents[1].style.display = "none";

            paymentInputs.forEach((input) => {
                input.addEventListener("change", function () {
                    paymentContents.forEach((content) => (content.style.display = "none"));
                    const selectedContent = document.querySelector(
                        `.payment_content.${this.value}`
                    );
                    if (selectedContent) selectedContent.style.display = "block";
                });
            });
        }

        initializeInstallmentListeners() {
            const installmentPrice = document.getElementById("installment-price");
            const installmentMonth = document.getElementById("installment-month");

            // 監聽價格相關的輸入變化
            const priceInputs = document.querySelectorAll(
                'input[name="engine"], input[name="trim"], input[name="color"]'
            );
            priceInputs.forEach((input) => {
                input.addEventListener("change", () => this.updateInstallmentOptions());
            });

            // 監聽分期選項的變化
            if (installmentPrice) {
                installmentPrice.addEventListener("change", () =>
                    this.calculateMonthlyPayment()
                );
            }
            if (installmentMonth) {
                installmentMonth.addEventListener("change", () =>
                    this.calculateMonthlyPayment()
                );
            }
            this.updateInstallmentOptions();
        }

        updateInstallmentOptions() {
            const modelPriceElement = document.getElementById("model-price");
            if (!modelPriceElement) return;

            // Get total price from the displayed price
            const totalPrice = parseInt(
                modelPriceElement.textContent.replace(/[^0-9]/g, "")
            );

            const installmentPrice = document.getElementById("installment-price");
            if (!installmentPrice) return;

            // Calculate max option based on total price
            const maxOption = Math.floor(totalPrice / 10000 / 5) * 5; // Round up to nearest multiple of 5

            // Generate options from 30 to maxOption in increments of 5
            let options = ['<option value="">請選擇分期金額</option>'];
            for (let i = 30; i <= maxOption; i += 5) {
                options.push(`<option value="${i}">${i}</option>`);
            }

            installmentPrice.innerHTML = options.join("");
        }

        calculateMonthlyPayment() {
            const installmentPrice = document.getElementById("installment-price");
            const installmentMonth = document.getElementById("installment-month");
            const monthlyPaymentElement = document.getElementById("monthly-payment");

            if (!installmentPrice || !installmentMonth || !monthlyPaymentElement) return;

            // Get selected values for installment price and months
            const selectedPrice = parseInt(installmentPrice.value) || 0; // In ten-thousands (e.g., 30 represents 300,000)
            const selectedMonths = parseInt(installmentMonth.value) || 0;

            // Calculate monthly payment only if both values are selected
            if (selectedPrice > 0 && selectedMonths > 0) {
                const monthlyPayment = Math.round((selectedPrice * 10000) / selectedMonths); // Convert price to actual value
                monthlyPaymentElement.textContent = `NT$${monthlyPayment.toLocaleString()}`;
            } else {
                monthlyPaymentElement.textContent = "--"; // Placeholder when no valid selection
            }
        }

        async fetchModelBySlug(slug) {
            try {
                console.log(`Fetching model data for slug: ${slug}`);
                const response = await fetch(
                    `${this.XANO_API_URL}/models/by-brand-slug?slug=${slug}`
                );
                if (!response.ok) {
                    throw new Error("Failed to fetch model data");
                }

                const data = await response.json();
                console.log("Model API response:", data);

                // 如果 API 返回的是陣列，篩選符合的車型
                if (Array.isArray(data)) {
                    const model = data.find((m) => m.slug === slug);
                    if (!model) {
                        throw new Error(`Model with slug "${slug}" not found`);
                    }
                    console.log("Found model:", model);
                    return model;
                }

                // 如果 API 返回的是單一物件，直接返回
                if (data && data.slug === slug) {
                    console.log("Found model:", data);
                    return data;
                }

                throw new Error(`Model with slug "${slug}" not found`);
            } catch (error) {
                console.error("Error fetching model by slug:", error);
                throw error;
            }
        }

        updateModelInfo(model) {
            if (!model) {
                console.error("Model data is missing or invalid");
                return;
            }

            // 更新車型名稱
            const modelName = document.getElementById("model-name");
            if (modelName) {
                modelName.textContent = model.name || "Unknown Model";
            } else {
                console.warn("Model name element is missing");
            }

            // 更新車型圖片
            const modelImages = document.querySelectorAll(".model-image");
            modelImages.forEach((img) => {
                if (model.base_image?.url) {
                    img.src = model.base_image.url;
                    img.srcset = model.base_image.url;
                    img.alt = model.name || "Model Image";
                }
            });

            // 更新車型價格
            const modelPrice = document.getElementById("model-price");
            if (modelPrice) {
                const formattedPrice = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "TWD",
                }).format(model.price || 0);
                modelPrice.textContent = formattedPrice;
            } else {
                console.warn("Model price element is missing");
            }

            const interiorImages = document.querySelectorAll(
                ".interior-carousel .splide__slide img"
            );
            if (model.interior_image && model.interior_image.length > 0) {
                // 清空現有的 slides
                const slideContainer = document.querySelector(
                    ".interior-carousel .splide__list"
                );
                if (slideContainer) {
                    slideContainer.innerHTML = "";

                    // 為每張內裝圖片創建新的 slide
                    model.interior_image.forEach((image) => {
                        const slide = document.createElement("div");
                        slide.className = "splide__slide";

                        const img = document.createElement("img");
                        img.src = image.url;
                        img.srcset = image.url;
                        img.alt = `${model.name} Interior`;

                        slide.appendChild(img);
                        slideContainer.appendChild(slide);
                    });
                    if (this.sliders.interior) {
                        this.sliders.interior.destroy();
                        this.sliders.interior = new Splide(".interior-carousel", {
                            type: "slide",
                            perPage: 1,
                            perMove: 1,
                            pagination: false,
                            arrows: true,
                        }).mount();
                    }
                }
            }
        }

        updatePriceDisplays() {
            const basePrice = this.currentConfig.model?.price || 0;
            const engineAdjustment = parseFloat(
                document.querySelector('input[name="engine"]:checked')?.dataset.price || 0
            );
            const trimAdjustment = parseFloat(
                document.querySelector('input[name="trim"]:checked')?.dataset.price || 0
            );
            const colorAdjustment = parseFloat(
                document.querySelector('input[name="color"]:checked')?.dataset.price || 0
            );

            // Add accessories price adjustments
            const accessoryAdjustments = Array.from(
                document.querySelectorAll('input[name="additional"]:checked')
            ).reduce((total, accessory) => {
                return total + (parseFloat(accessory.dataset.price) || 0);
            }, 0);

            // 計算總價格
            const totalPrice =
                basePrice +
                engineAdjustment +
                trimAdjustment +
                colorAdjustment +
                accessoryAdjustments;

            // 更新所有相关的价格显示元素
            const priceElements = {
                modelPrice: document.getElementById("model-price"),
                cashPrice: document.getElementById("cash-price"),
            };

            const formattedPrice = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "TWD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(totalPrice);

            // 價格顯示
            Object.values(priceElements).forEach((element) => {
                if (element) {
                    element.textContent = formattedPrice;
                }
            });

            this.updateInstallmentOptions();

            this.calculateMonthlyPayment();
        }

        async initializeConfigurator() {
            try {
                if (!this.currentConfig.model) {
                    throw new Error("Missing model information");
                }
                this.updateModelInfo(this.currentConfig.model);
            } catch (error) {
                console.error("Error initializing configurator:", error);
                throw error;
            }
        }

        showError(message) {
            const errorElement = document.getElementById("error-message");
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.style.display = "block";
            }
            console.error(message);
        }

        async loadAreaOptions() {
            try {
                const response = await fetch(`${this.XANO_API_URL}/branddealers`);
                if (!response.ok) throw new Error("Failed to fetch dealer data");
                const dealersData = await response.json();

                // Get brand ID from the current URL path
                const pathSegments = window.location.pathname.split('/');
                const brandSlug = pathSegments[1]; // e.g., "peugeot" from "/peugeot/single-config"

                // Filter dealers for current brand's page
                const currentBrandDealers = dealersData
                    .filter(dealer => {
                        // Match dealer's brand with current page's brand
                        return dealer._dealers &&
                            dealer.brands_id === this.getBrandIdFromSlug(brandSlug);
                    })
                    .sort((a, b) => a.id - b.id);

                const areaMap = new Map();
                currentBrandDealers.forEach(dealer => {
                    if (dealer._dealers?.area) {
                        areaMap.set(dealer._dealers.area, true);
                    }
                });

                const uniqueAreas = Array.from(areaMap.keys());
                const areaSelect = document.getElementById("area");
                if (!areaSelect) return;

                areaSelect.innerHTML = `
              <option value="">請選擇鄰近縣市</option>
              ${uniqueAreas.map(area => `<option value="${area}">${area}</option>`).join("")}
          `;

                this.dealersData = currentBrandDealers;

                const navDealerResult = document.querySelector(".nav_dealer_result");
                if (navDealerResult) {
                    navDealerResult.style.display = "none";
                }
            } catch (error) {
                console.error("Error loading areas:", error);
            }
        }

        async handleAreaChange(selectedArea) {
            const dealerContainer = document.querySelector(".dealer-options");
            dealerContainer.innerHTML = "";

            if (!selectedArea) {
                dealerContainer.style.display = "none";
                return;
            }

            const dealersInArea = this.dealersData.filter(
                dealer => dealer._dealers?.area === selectedArea
            );

            dealerContainer.style.display = "block";
            dealersInArea.forEach(dealer => {
                const dealerOption = document.createElement("label");
                dealerOption.className = "form_option_wrap w-radio";
                dealerOption.innerHTML = `
            <input type="radio" 
                name="dealer" 
                id="dealer-${dealer.dealers_id}" 
                data-name="dealer" 
                required 
                class="w-form-formradioinput hide w-radio-input" 
                value="${dealer._dealers?.name}"
                data-address="${dealer._dealers?.address || ''}">
            <div class="form_radio_card">
                <div class="radio_mark">
                    <div class="radio_dot"></div>
                </div>
                <div class="option_content">
                    <div class="u-weight-bold">${dealer._dealers?.name || ''}</div>
                    <div>${dealer._dealers?.address || ''}</div>
                </div>
            </div>
            <span class="hide w-form-label" for="dealer-${dealer.dealers_id}">Radio</span>
            `;

                dealerContainer.appendChild(dealerOption);

                const input = dealerOption.querySelector("input");
                if (input) {
                    input.addEventListener("change", () => {
                        if (input.checked) {
                            this.currentConfig.retail = dealer.dealers_id;
                            const navDealerResult = document.querySelector(".nav_dealer_result");
                            if (navDealerResult) {
                                navDealerResult.style.display = "block";
                                const navDealerName = navDealerResult.querySelector("div:last-child");
                                if (navDealerName) {
                                    navDealerName.textContent = dealer._dealers?.name || '';
                                }
                            }
                        }
                    });
                }
            });
        }

        // Add this method to the ConfiguratorPage class
        updateSummary() {
            // Update engine summary
            const selectedEngine = document.querySelector(
                'input[name="engine"]:checked'
            );
            const summaryEngine = document.getElementById("summary-engine");
            const summaryEnginePrice = document.getElementById("summary-engine-price");

            if (selectedEngine && summaryEngine && summaryEnginePrice) {
                const engineLabel = selectedEngine
                    .closest(".form_option_wrap")
                    .querySelector(".u-weight-bold").textContent;
                summaryEngine.textContent = engineLabel;

                const enginePrice = parseFloat(selectedEngine.dataset.price) || 0;
                summaryEnginePrice.textContent =
                    enginePrice > 0 ? `+NT$${enginePrice.toLocaleString()}` : "包含";
            }

            // Update trim summary
            const selectedTrim = document.querySelector('input[name="trim"]:checked');
            const summaryTrim = document.getElementById("summary-trim");
            const summaryTrimPrice = document.getElementById("summary-trim-price");

            if (selectedTrim && summaryTrim && summaryTrimPrice) {
                const trimLabel = selectedTrim
                    .closest(".form_option_wrap")
                    .querySelector(".u-weight-bold").textContent;
                summaryTrim.textContent = trimLabel;

                const modelPrice = this.currentConfig.model?.price || 0;
                const trimPrice = parseFloat(selectedTrim.dataset.price) || 0;
                const totalPrice = modelPrice + trimPrice;
                summaryTrimPrice.textContent = `NT$${totalPrice.toLocaleString()}`;
            }

            const selectedColor = document.querySelector('input[name="color"]:checked');
            const summaryColor = document.getElementById("summary-color");
            const summaryColorPrice = document.getElementById("summary-color-price");

            if (selectedColor && summaryColor && summaryColorPrice) {
                const colorLabel = document.querySelector(".color-label").textContent;
                summaryColor.textContent = colorLabel;

                const colorPrice = parseFloat(selectedColor.dataset.price) || 0;
                summaryColorPrice.textContent =
                    colorPrice > 0 ? `+NT$${colorPrice.toLocaleString()}` : "包含";
            }

            const selectedAccessories = document.querySelectorAll(
                'input[name="additional"]:checked'
            );
            const summaryGroup = document.querySelector(".summary_group");

            const oldAccessorySummaries = document.querySelectorAll(
                ".summary_row.accessory"
            );
            oldAccessorySummaries.forEach((row) => row.remove());

            selectedAccessories.forEach((accessory) => {
                const accessoryRow = document.createElement("div");
                accessoryRow.className = "summary_row accessory";
                const priceAdjustment = parseFloat(accessory.dataset.price) || 0;

                accessoryRow.innerHTML = `
                <div>${accessory
                        .closest(".form_option_wrap")
                        .querySelector(".u-weight-bold").textContent
                    }</div>
                <div>${priceAdjustment > 0
                        ? `+NT$${priceAdjustment.toLocaleString()}`
                        : "包含"
                    }</div>
            `;

                const specLink = summaryGroup
                    .querySelector("#summary-spec-link")
                    ?.closest(".summary_row");
                if (specLink) {
                    summaryGroup.insertBefore(accessoryRow, specLink);
                } else {
                    summaryGroup.appendChild(accessoryRow);
                }
            });

            const existingSpecLink = document.getElementById("summary-spec-link")?.closest(".summary_row");
            if (existingSpecLink) {
                existingSpecLink.remove();
            }

            if (selectedTrim) {
                const trimData = this.configurationData.find(config =>
                    config._trims.some(trim =>
                        trim.id === parseInt(selectedTrim.id.replace('trim-', ''))
                    )
                )?._trims[0];

                if (trimData?.pdf?.url) {
                    const specLinkRow = document.createElement("div");
                    specLinkRow.className = "summary_row";
                    specLinkRow.innerHTML = `
                    <a href="${trimData.pdf.url}" 
                    target="_blank" 
                    class="text_link_secondary w-inline-block"
                    id="summary-spec-link">
                        <div>檢視詳細規格表ⓘ</div>
                    </a>
                `;
                    summaryGroup.appendChild(specLinkRow);
                }
            }

        }

        async updateEngineOptions() {
            try {
                if (!this.currentConfig.model || !this.configurationData) {
                    throw new Error("Model information or configuration data is missing");
                }

                const uniqueEngines = [];
                const engineSet = new Set();

                this.configurationData.forEach((item) => {
                    item._engines.forEach((engine) => {
                        if (!engineSet.has(engine.id)) {
                            engineSet.add(engine.id);
                            uniqueEngines.push(engine);
                        }
                    });
                });

                const engineContainer = document.querySelector(
                    ".engine-selection .radio-group"
                );
                if (!engineContainer) return;

                engineContainer.innerHTML = "";

                uniqueEngines.forEach((engine, index) => {
                    const engineOption = document.createElement("label");
                    engineOption.className = "form_option_wrap w-radio";

                    engineOption.innerHTML = `
                            <input type="radio" 
                                name="engine" 
                                id="engine-${engine.id}" 
                                data-name="engine" 
                                data-price="${engine.price_adjustment || 0}"
                                required 
                                class="w-form-formradioinput hide w-radio-input" 
                                value="${engine.name}"
                                ${index === 0 ? "checked" : ""}>
                            <div class="form_radio_card">
                                <div class="radio_mark">
                                    <div class="radio_dot"></div>
                                </div>
                                <div class="option_content">
                                    <div class="option_title_row">
                                        <div class="u-weight-bold">${engine.name
                        }</div>
                                        <div>${engine.price_adjustment > 0
                            ? `+NT$${engine.price_adjustment}`
                            : "+NT$0"
                        }</div>
                                    </div>
                                    <span>${engine.power}</span>
                                </div>
                            </div>
                            <span class="hide w-form-label" for="engine-${engine.id
                        }">Engine${index + 1}</span>
                        `;

                    engineContainer.appendChild(engineOption);

                    const input = engineOption.querySelector("input");
                    if (input) {
                        input.addEventListener("change", async () => {
                            if (input.checked) {
                                this.currentConfig.engine = engine.id;
                                this.updatePriceDisplays();
                                await this.handleEngineChange(engine.id);
                            }
                        });

                        if (index === 0) {
                            input.dispatchEvent(new Event("change"));
                        }
                    }
                });
            } catch (error) {
                console.error("Error updating engine options:", error);
            }
        }

        async handleEngineChange(engineId) {
            console.log("Engine changed:", engineId);

            this.currentConfig.engine = engineId;
            const availableTrims = await this.getTrimsForEngine(engineId);

            this.currentConfig.trim = null;
            this.renderTrimOptions(availableTrims);
            this.updateSummary();
        }

        async getTrimsForEngine(engineId) {
            try {
                // Filter configuration data for the selected engine
                const relevantConfigs = this.configurationData.filter((config) =>
                    config._engines.some((engine) => engine.id === parseInt(engineId))
                );

                const uniqueTrims = [];
                const trimSet = new Set();

                relevantConfigs.forEach((config) => {
                    config._trims.forEach((trim) => {
                        if (!trimSet.has(trim.id)) {
                            trimSet.add(trim.id);
                            uniqueTrims.push(trim);
                        }
                    });
                });

                return uniqueTrims;
            } catch (error) {
                console.error("Error getting trim options:", error);
                return [];
            }
        }

        renderTrimOptions(trims) {
            console.log("Rendering trim options:", trims);

            const summaryTrimPrice = document.getElementById("summary-trim-price");
            const trimContainer = document.querySelector(
                ".trim-selection .radio-group"
            );

            if (!trimContainer) {
                console.error("Trim container not found");
                return;
            }

            trimContainer.innerHTML = "";

            // Find the configuration data for each trim
            trims.forEach((trim, index) => {
                // Find the matching configuration for this trim
                const trimConfig = this.configurationData.find((config) =>
                    config._trims.some((t) => t.id === trim.id)
                );

                const trimPrice = trimConfig ? trimConfig.trim_price : 0;

                const trimOption = document.createElement("label");
                trimOption.className = "form_option_wrap w-radio";
                trimOption.innerHTML = `
                <input type="radio" 
                    name="trim" 
                    id="trim-${trim.id}" 
                    data-name="trim"
                    data-price="${trimPrice}"
                    required 
                    class="w-form-formradioinput hide w-radio-input" 
                    value="${trim.name}"
                    ${index === 0 ? "checked" : ""}>
                <div class="form_radio_card">
                    <div class="radio_mark">
                        <div class="radio_dot"></div>
                    </div>
                    <div class="option_content">
                        <div class="option_title_row">
                            <div class="u-weight-bold">${trim.name}</div>
                            <div>${trimPrice > 0 ? `+NT$${trimPrice}` : "+NT$0"
                    }</div>
                        </div>
                        <div>${trim.description || ""}</div>
                        <a href="${trim.pdf?.url || '#'}" 
                            target="_blank" 
                            class="text_link_secondary w-inline-block"
                            ${!trim.pdf?.url ? 'style="display:none;"' : ''}>
                                <div>檢視詳細規格表ⓘ</div>
                        </a>
                    </div>
                </div>
                <span class="hide w-form-label" for="trim-${trim.id}">Trim${index + 1
                    }</span>
            `;

                trimContainer.appendChild(trimOption);

                const input = trimOption.querySelector("input");
                input.addEventListener("change", () => {
                    if (input.checked) {
                        this.currentConfig.trim = trim.id;
                        if (summaryTrimPrice) {
                            const modelPrice = this.currentConfig.model?.price || 0;
                            const trimPrice = trim.price_adjustment || 0;
                            const totalPrice = modelPrice + trimPrice;
                            summaryTrimPrice.textContent = `NT$${totalPrice.toLocaleString()}`;
                        }
                        this.updatePriceDisplays();
                        this.handleTrimChange(trim.id);
                        this.updateSummary();
                    }
                });

                if (index === 0) {
                    input.dispatchEvent(new Event("change"));
                }
            });
        }

        async getColorsForTrim(engineId, trimId) {
            try {
                const relevantConfigs = this.configurationData.filter(
                    (config) =>
                        config._engines.some((engine) => engine.id === parseInt(engineId)) &&
                        config._trims.some((trim) => trim.id === parseInt(trimId))
                );

                const uniqueColors = [];
                const colorSet = new Set();

                relevantConfigs.forEach((config) => {
                    config._colors.forEach((color) => {
                        if (!colorSet.has(color.id)) {
                            colorSet.add(color.id);
                            uniqueColors.push(color);
                        }
                    });
                });

                return uniqueColors;
            } catch (error) {
                console.error("Error getting color options:", error);
                return [];
            }
        }

        async handleTrimChange(trimId) {
            this.currentConfig.trim = trimId;
            const availableColors = await this.getColorsForTrim(
                this.currentConfig.engine,
                trimId
            );
            this.renderColorOptions(availableColors);
            this.renderAccessoryOptions();
            this.renderSpecifications();
        }

        // Handle accessory updates
        renderAccessoryOptions() {
            const accessories =
                this.configurationData.find(
                    (config) =>
                        config._engines.some(
                            (engine) => engine.id === parseInt(this.currentConfig.engine)
                        ) &&
                        config._trims.some(
                            (trim) => trim.id === parseInt(this.currentConfig.trim)
                        )
                )?.accessories_id?.[0] || [];

            const additionalContainer = document.querySelector(
                ".additional-selection .radio-group"
            );
            const additionalSelection = document.querySelector(".additional-selection");
            if (!additionalContainer || !additionalSelection) return;

            // Clear existing options
            additionalContainer.innerHTML = "";

            // Check if there are any accessories
            if (accessories.length === 0) {
                additionalSelection.style.display = "none";
                return;
            } else {
                additionalSelection.style.display = "block";
            }

            // Render accessory options
            accessories.forEach((accessory) => {
                const accessoryOption = document.createElement("label");
                accessoryOption.className = "w-checkbox form_option_wrap";
                accessoryOption.innerHTML = `
                <input type="checkbox" 
                    name="additional" 
                    id="additional-${accessory.id}" 
                    data-name="additional"
                    data-price="${accessory.price_adjustment || 0}"
                    class="w-checkbox-input hide">
                <div class="form_checkbox_card">
                    <div class="checkbox_mark">
                        <img src="https://cdn.prod.website-files.com/6735d5a11d254f870165369e/674d7c6dcb52ffc2b5b4eab7_small-check.svg" loading="lazy" alt="" class="check">
                    </div>
                    <div class="option_content">
                        <div class="option_title_row">
                            <div class="u-weight-bold">${accessory.name}</div>
                            <div>+NT$${accessory.price_adjustment.toLocaleString()}</div>
                        </div>
                        <div>${accessory.description || ""}</div>
                    </div>
                </div>
                <span class="hide w-form-label" for="additional-${accessory.id
                    }">Checkbox</span>
            `;

                additionalContainer.appendChild(accessoryOption);

                const input = accessoryOption.querySelector("input");
                input.addEventListener("change", () => {
                    this.updateSummary();
                    this.updatePriceDisplays();
                });
            });
        }

        // Updated renderColorOptions method to use color_options
renderColorOptions(colors) {
    console.log("Rendering color options:", colors);
    const colorContainer = document.querySelector(".color-swatches");
    const colorLabel = document.querySelector(".color-label");
    const colorPrice = document.querySelector(".color-price");

    if (!colorContainer) {
        console.error("Color container not found");
        return;
    }

    colorContainer.innerHTML = "";

    // Get current configuration's color options
    const currentConfig = this.configurationData.find(
        (config) =>
            config._engines.some(
                (engine) => engine.id === parseInt(this.currentConfig.engine)
            ) &&
            config._trims.some(
                (trim) => trim.id === parseInt(this.currentConfig.trim)
            )
    );

    const colorOptions = currentConfig?.color_options || [];
    
    // Filter active colors
    const activeColors = colorOptions.filter(color => color.is_active);

    activeColors.forEach((color, index) => {
        const colorOption = document.createElement("div");
        colorOption.className = "color-swatch";
        colorOption.innerHTML = `
            <input type="radio" 
                name="color" 
                id="color-${index}" 
                value="${color.color_name}" 
                data-name="color"
                data-price="${color.price_adjustment || 0}"
                ${index === 0 ? "checked" : ""}>
            <label for="color-${index}">
                <img src="${color.swatch_image?.url || ''}" alt="${color.color_name}">
            </label>
        `;

        colorContainer.appendChild(colorOption);

        const input = colorOption.querySelector("input");
        input.addEventListener("change", () => {
            if (input.checked) {
                this.switchView("exterior");
                this.currentConfig.color = color.color_name;

                if (colorLabel) {
                    colorLabel.textContent = color.color_name;
                }
                if (colorPrice) {
                    colorPrice.textContent =
                        color.price_adjustment > 0
                            ? `+NT$${color.price_adjustment}`
                            : "+NT$0";
                }

                this.updatePriceDisplays();
                this.updateColorDisplay(color);
                this.updateSummary();
            }
        });

        // Initialize first color
        if (index === 0 && input.checked) {
            colorLabel.textContent = color.color_name;
            if (colorPrice) {
                colorPrice.textContent =
                    color.price_adjustment > 0
                        ? `+NT$${color.price_adjustment}`
                        : "+NT$0";
            }
        }
    });
}

        renderSpecifications() {
            const currentConfig = this.configurationData.find(config =>
                config._engines.some(engine => engine.id === parseInt(this.currentConfig.engine)) &&
                config._trims.some(trim => trim.id === parseInt(this.currentConfig.trim))
            );

            const specs = currentConfig?._completespecs?.specifications || [];
            const specList = document.querySelector('.spec_list');
            if (!specList) return;

            // Clear existing specs
            specList.innerHTML = '';

            // Group specifications by category
            const groupedSpecs = specs.reduce((acc, spec) => {
                const categoryId = spec.speccategory_id;
                if (!acc[categoryId]) {
                    acc[categoryId] = {
                        category_name: spec._speccategory.category_name,
                        specs: []
                    };
                }
                acc[categoryId].specs.push(spec);
                return acc;
            }, {});

            // Create accordion for each category
            Object.values(groupedSpecs).forEach(category => {
                const accordionWrap = document.createElement('div');
                accordionWrap.className = 'accordion_wrap is-spec';

                accordionWrap.innerHTML = `
                <div class="accordion_toggle u-hflex-between-top is-spec">
                    <h4 class="spec_group_title">${category.category_name}</h4>
                    <div class="accordion_icon">
                        <div class="accordion_hline"></div>
                        <div class="accordion_vline"></div>
                    </div>
                </div>
                <div class="accordion_content">
                    <table style="width: 100%;">
                        <tbody>
                            ${category.specs.map(spec =>
                    spec.label && spec.content ? `
                                    <tr>
                                        <td style="width: 50%">${spec.label}</td>
                                        <td style="width: 50%">${spec.content}</td>
                                    </tr>
                                ` : ''
                ).join('')}
                        </tbody>
                    </table>
                </div>
            `;

                // Add click handler for accordion toggle
                const toggle = accordionWrap.querySelector('.accordion_toggle');
                const content = accordionWrap.querySelector('.accordion_content');
                const icon = accordionWrap.querySelector('.accordion_icon');

                toggle.addEventListener('click', () => {
                    const isOpen = accordionWrap.classList.contains('is-active');
                    accordionWrap.classList.toggle('is-active');
                    content.style.maxHeight = isOpen ? null : `${content.scrollHeight}px`;
                    icon.classList.toggle('is-active');
                });

                specList.appendChild(accordionWrap);
            });
        }

        refreshSliders() {
            const exteriorElement = document.querySelector(".exterior-carousel");
            const interiorElement = document.querySelector(".interior-carousel");

            if (this.state.currentView === "exterior") {
                if (exteriorElement) {
                    exteriorElement.style.display = "block";
                    this.sliders.exterior?.refresh();
                }
                if (interiorElement) {
                    interiorElement.style.display = "none";
                }
            } else {
                if (exteriorElement) {
                    exteriorElement.style.display = "none";
                }
                if (interiorElement) {
                    interiorElement.style.display = "block";
                    this.sliders.interior?.refresh();
                }
            }
        }

        // Updated updateColorDisplay method to handle multi-image support
updateColorDisplay(color) {
    const currentConfig = this.configurationData.find(
        (config) =>
            config._engines.some(
                (engine) => engine.id === parseInt(this.currentConfig.engine)
            ) &&
            config._trims.some(
                (trim) => trim.id === parseInt(this.currentConfig.trim)
            )
    );

    // Get selected color from color_options
    const selectedColorOption = currentConfig?.color_options?.find(
        opt => opt.color_name === color.color_name
    );

    // Handle exterior images
    const exteriorSlideList = document.querySelector(
        ".exterior-carousel .splide__list"
    );
    
    if (exteriorSlideList && selectedColorOption?.final_image) {
        exteriorSlideList.innerHTML = "";
        
        // Create slides for each image
        selectedColorOption.final_image.forEach((image, index) => {
            if (image && image.url) {
                const slide = document.createElement("div");
                slide.className = "splide__slide";
                slide.innerHTML = `
                    <img src="${image.url}" 
                         srcset="${image.url}" 
                         alt="${this.currentConfig.model.name} - ${color.color_name} Exterior ${index + 1}">
                `;
                exteriorSlideList.appendChild(slide);
            }
        });

        // Refresh exterior slider
        if (this.sliders.exterior) {
            this.sliders.exterior.refresh();
        }
    }

    // Handle interior images (if present in model configuration)
    const interiorSlideList = document.querySelector(
        ".interior-carousel .splide__list"
    );
    
    if (interiorSlideList && this.currentConfig.model?.interior_image) {
        interiorSlideList.innerHTML = "";
        
        this.currentConfig.model.interior_image.forEach((image, index) => {
            if (image && image.url) {
                const slide = document.createElement("div");
                slide.className = "splide__slide";
                slide.innerHTML = `
                    <img src="${image.url}" 
                         srcset="${image.url}" 
                         alt="${this.currentConfig.model.name} Interior ${index + 1}">
                `;
                interiorSlideList.appendChild(slide);
            }
        });

        // Refresh interior slider
        if (this.sliders.interior) {
            this.sliders.interior.refresh();
        }
    }

    this.refreshSliders();
}
    }

    document.addEventListener("DOMContentLoaded", () => {
        window.configuratorInstance = new ConfiguratorPage();

        const submitButton = document.querySelector('input[type="submit"][data-form="submit-btn"]');
        if (submitButton) {
            submitButton.addEventListener("click", function (e) {
                e.preventDefault();
                const form = submitButton.closest("form");
                const formData = new FormData(form);
                const data = {};

                data.area = formData.get("area");
                data.engine = formData.get("engine");
                data.trim = formData.get("trim");
                data.color = formData.get("color");
                data.additional = formData.getAll("additional");
                data.payment = formData.get("payment");
                data.installmentPrice = formData.get("installment-price");
                data.installmentMonth = formData.get("installment-month");

                const selectedDealer = document.querySelector('input[name="dealer"]:checked');
                if (selectedDealer) {
                    data.dealerName = selectedDealer.value;
                    data.dealerAddress = selectedDealer.dataset.address;
                }

                const configuratorInstance = window.configuratorInstance;
                if (configuratorInstance?.currentConfig?.model) {
                    data.model = configuratorInstance.currentConfig.model.name;
                }

                localStorage.setItem("formData", JSON.stringify(data));
                window.location.href = "/peugeot/checkout";
            });
        }
    });
