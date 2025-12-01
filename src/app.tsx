import styles from "./app.module.css"
import {A, Route, Router} from "@solidjs/router";
import "virtual:uno.css"
import "./style/theme/glass/theme.scss"
import ExportConfig from "~/app/ImportConfig/ExportConfig"
import Home from "~/app/Home/Home"
import ContactUs from "~/app/ContactUs/ContactUs"
import {TestPage} from "~/app/TestPage/TestPage"

export default function App() {
    return (
        <Router
            root={(props: any) => (
                <div class={styles.appGrid} sizing={"w-full"} spacing={"pa-4"}>
                    <header grid-row={"start-1 span-1"} grid-col={"start-1"} flex={"row gap-4"} sizing={"h-4"}>
                        <i>menu</i>
                        <h1>Theme builder Test</h1>
                    </header>
                    <nav
                        class={"glass"}
                        grid-row={"start-1 span-2"}
                        grid-col={"start-1"}
                        flex={"row gap-1 center"}
                        spacing={"px-2 py-4 ma-auto"}
                        sizing={"w-40%"}>
                        <A href={"/export"}>
                            <span>
                                Export
                            </span>
                        </A>
                        <A href={"/editor"}>
                            <span>
                                Theme
                            </span>
                        </A>
                        <A href={"/contact"}>
                            <span>
                                Contact Us
                            </span>
                        </A>
                    </nav>
                    <main class={"filled"}
                          grid-row={"start-2 span-2"}
                          grid-col={"start-1"}
                          sizing={"h-full min-w-200 max-w-400 w-70%"}
                          spacing={"pa-8 pt-16 ma-auto"} >
                        {props.children}
                    </main>
                </div>

            )}
        >
            <Route path={"/"} component={Home} info={{title: "Home", filesystem: true}}/>
            <Route path={"/export"} component={ExportConfig} info={{title: "Import"}}/>
            {/*<Route path={"/editor"} component={ThemeEditor} info={{title: "Editor"}}/>*/}
            <Route path={"/contact"} component={ContactUs} info={{title: "Contact Us"}}/>
            <Route path={"/test"} component={TestPage} info={{title: "Contact Us"}}/>
        </Router>
    )
}
