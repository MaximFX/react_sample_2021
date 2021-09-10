import store from '../../globalStore/globalStore'
import {animateScrollToElement} from "../../functions/animateScrollToElement";
import {setAjaxProduct, setPagination, startWaitAjaxProduct} from "../../globalStore/actions/currentPageAC";
import {tryPost} from "../../functions/axios/tryAjax";

/**
 * ИСПОЛЬЗОВАТЬ ТОЛЬКО ЧЕРЕЗ
 * @see ItemsServiceContainer
 */
export default class PaginationService {

    constructor(container, srcPath) {

        /**@see ItemsServiceContainer*/
        this.container = container;
        this.srcPath = srcPath;

        const state = store.getState();

        this.windowTitle = state.currentPage.windowTitle !== undefined ? state.currentPage.windowTitle : "";

        this.initPagination(state.currentPage !== undefined ? state.currentPage.pagination : {});

        //Когда нажимаем показать еще, загружаем страницы, это счетчик сколько страниц загружено через показать еще.
        //нужен чтобы подсчитать кол-во товаров, Которые отображаются на странице
        this.startPageLoaded = state.currentPage.pagination.start;
        this.loadPagesOnThisPage = this.getCurrentPage() - this.startPageLoaded + 1;
        this.isChangeUrl = true;
        this.moveToTopScrollClassTarget = null;

        this.onChangeCallback = [];
    }

    /**
     * Callback, при изменении страницы в сервисе
     * подумай на счет накопления callback функций, в иделае callback`и вешать в конструкторе корневого компонента
     * Пример, в контейнере товаров был создан синглтон этого сервиса. А в конструкторе дочернего происходит регистрация callback
     * Если по дальнейшей логике, дочерний компонент будет удаляться со странице, и появлятся заново (Mount, Unmount), то у него будет запускаться
     * снова constructor и накапливаться привязки callback`ов
     */
    setOnChangeCallback(callback){
        if (!this.onChangeCallback.includes(callback)){
            this.onChangeCallback.push(callback);
        }
    }

    executeCallback(callbackArray){
        if (Array.isArray(callbackArray) && callbackArray.length > 0) {
            callbackArray.map(callback => typeof callback === "function" && callback());
        }
    }

    /**
     * Будет ли в url появляться page=x
     * @param isChangeUrl
     */
    setIsChangeUrl(isChangeUrl){
        this.isChangeUrl = isChangeUrl;
    }

    /**
     * При прокрутке вверх, когда нажимаем на пагинацию, по умолчанию прокручиваем тэг body, но если пагинация
     * в папапе, то нужно указать, какой контейнер будет прокручивать вверх.
     * @param className
     */
    setMoveToTopScrollClassTarget(className){
        this.moveToTopScrollClassTarget = className;
    }

    initPagination(pagination){
        this.pagination = (pagination !== undefined) ? pagination : {};
    }

    getCurrentPage(){
        return parseInt(this.pagination.currentPage !== undefined ? this.pagination.currentPage : 1);
    }

    getPerPage(){
        return parseInt(this.pagination.perPage !== undefined ? this.pagination.perPage : 1);
    }

    getLastPage(){
        return parseInt(this.pagination.lastPage !== undefined ? this.pagination.lastPage : 1);
    }


    getCountOnThisPage(){
        return parseInt(this.pagination.countOnThisPage !== undefined ? this.pagination.countOnThisPage : 1);
    }

    getShownObjectsCount(){

        //т.к. последняя страница может быть не полной
        if(this.getCurrentPage() === this.getLastPage()) {
            return ((this.loadPagesOnThisPage - 1) * this.pagination.perPage) + this.getCountOnThisPage();
        } else {
            return this.loadPagesOnThisPage * this.pagination.perPage;
        }

    }

    /**
     * Всего объектов на странице (имеется ввиду все товары а не те что на текущей пагинации.)
     * если конкретно сколько здесь товаров, то нужно вызвать getCountOnThisPage()
     * @returns {number}
     */
    getTotalObjects(){
        return parseInt(this.pagination.total !== undefined ? this.pagination.total : 0);
    }


    setCurrentPage(targetPage){
        this.pagination.currentPage = targetPage;
    }

    /**
     * Данная функция только изменит атрибут this.pagination.currentPage
     * нужна только для отслеживания классов и функций, которые менют текущую страницу.
     *
     * в большинстве случаев мы это делаем перед отправкой формы сортировки или фильтрации.
     * т.к. в дальнейшем это поле будет использоваться для сборки URL getRelevantUrl()
     */
    resetCurrentPage(){
        this.setCurrentPage(1);
        this.loadPagesOnThisPage = 1;
        this.startPageLoaded = 1;
    }

    changePage(api_url, targetPage, isAppendProduct = false, isAnimateToTop = true){

        if (api_url === null) {
            api_url = this.srcPath;
        }

        if (this.getLastPage() >= targetPage && targetPage > 0) {
            this.setCurrentPage(targetPage);

            //при переходе по ссылке в пагинации, сбрасываем кол-во страниц загруженных через показть еще до 1
            if (isAppendProduct) {
                this.loadPagesOnThisPage++;
            } else {
                this.loadPagesOnThisPage = 1;
                this.startPageLoaded = targetPage;
            }



            let url = this.container.getCurrentUrlService().getRelevantUrl();

            this.container.getCurrentUrlService().changeHistoryUrl(url, this.isChangeUrl);

            (this.windowTitle !== "" && this.isChangeUrl) && this.container.getCurrentUrlService().changeCurrentPageTitle(this.getTitleWithPage());

            this.executeCallback(this.onChangeCallback);

            //Поднимем, именно перед отправкой запроса, чтобы сгладить время запроса
            !isAppendProduct && isAnimateToTop && animateScrollToElement("pagination-head", "scrollTop", "", 300, true, -200, true, this.moveToTopScrollClassTarget);

            store.dispatch(startWaitAjaxProduct());

            tryPost(
                api_url + this.container.getCurrentUrlService().getQueryString(),
                {
                    url: this.container.getCurrentUrlService().getPathUrl()
                },
                (response) => {
                    this.initPagination(response.data.objects.pagination);
                    this.updateItemList(response.data.objects, isAppendProduct);
                }
            );

        }

    }

    updateItemList(objects, isAppendProduct){
        store.dispatch(setAjaxProduct(objects, isAppendProduct));
    }

    getTitleWithPage(){
        if (this.getCurrentPage() === 1) {
            return this.windowTitle;
        }
        return `Страница ${this.getCurrentPage()} из ${this.getLastPage()} - ` + this.windowTitle;
    }

    /**
     * Требуется в CurrentUrlService для сборки URL, в основном для сервиса фильтрации, объяснение в сервисе CurrentUrlService
     */
    getCurrentPageConfig(){
        if (this.getCurrentPage() > 1) {
            if (this.loadPagesOnThisPage > 1) {
                return [
                    {field: "page", value: this.getCurrentPage()},
                    {field: "start", value: this.startPageLoaded},
                ]
            } else {
                return [
                    {field: "page", value: this.getCurrentPage()},
                ]
            }

        } else {
            return [];
        }
    }


    /**
     * Получаем url, для построения пагинации на текущей страницы
     * @param page_num
     * @returns {string}
     */
    getLink(page_num) {

        let query = this.container.getCurrentUrlService().getQueryString();

        let new_query = '';
        if (parseInt(page_num) !== 1) {
            new_query = this.container.getCurrentUrlService().setQueryParam(query, [{field: "page", value: page_num}])
        } else {
            new_query = this.container.getCurrentUrlService().setQueryParam(query, [{field: "page", value: undefined}])
        }


        return this.container.getCurrentUrlService().getPathUrl() + new_query;
    }











}
