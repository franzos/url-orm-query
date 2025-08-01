import { QueryParamsUpdate } from "./query-params";
import { ApiQueryOptions } from "./api-query-options";

/**
 * Easy pagination based on ApiQueryOptions
 * Pagination is based on offset and limit
 * @param T type of entity
 * 
 * First page is 1.
 * 
 * Usage:
 * 1. Create pagination object
 * 2. Set total number of results
 * 3. Use url() to get url for first page
 * 4. Use changePage() to get url for next page
 */
export class ApiPagination<T> {
    public apiQueryOptions: ApiQueryOptions<T>;
    public perPage: number
    public currentPage: number
    public totalPages: number
    public total: number

    /**
     * Setup pagination
     * @param apiQueryOptions query options with filters, relations, order by, limit and offset
     * @param perPage results per page (defaults to apiQueryOptions.params.limit)
     */
    constructor(apiQueryOptions?: ApiQueryOptions<T>, perPage?: number) {
        if (apiQueryOptions) {
            this.apiQueryOptions = apiQueryOptions;
        } else {
            this.apiQueryOptions = new ApiQueryOptions<T>();
        }

        if (perPage) {
            this.perPage = perPage;
        } else {
            this.perPage = this.apiQueryOptions.params.limit;
        }

        this.currentPage = 1;
    }

    /**
     * Supply result count to calculate total pages
     * @param total total number of results
     */
    setTotal(total: number) {
        this.total = total;
        this.totalPages = Math.ceil(total / this.perPage);
    }

    private setCurrentPage(currentPage: number) {
        if (currentPage === 0) {
            throw new Error('Page number cannot be 0');
        }
        this.currentPage = currentPage;
        this.apiQueryOptions.setOffset((currentPage - 1) * this.perPage);
    }

    url() {
        return this.apiQueryOptions.toUrl();
    }

    /**
     * Get the next page
     * @returns url with next page
    */
    changePage(page: number) {
        this.setCurrentPage(page);
        return this.apiQueryOptions.toUrl();
    }

    /**
     * This is for subsequent calls
     * @param params 
     */
    loadAndMerge(params: QueryParamsUpdate<T>) {
        this.apiQueryOptions.loadAndMerge(params);
        if (params.page) {
            this.setCurrentPage(params.page);
        }
        if (params.clearParams) {
            this.currentPage = 1;
        }
    }
}